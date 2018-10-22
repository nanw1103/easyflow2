const EventEmitter = require('events')

const util = require('util')

function getArgs(func) {
	// First match everything inside the function argument parens.
	let matcher = func.toString().match(/function\s.*?\(([^)]*)\)/)
	if (!matcher)
		return []
	
	let args = matcher[1]
   
	// Split the arguments string into an array comma delimited.
	return args.split(',')
		.map(arg => arg.replace(/\/\*.*\*\//, '').trim())	// Ensure no inline comments are parsed and trim the whitespace.
		.filter(arg => arg)	// Ensure no undefined values are added.
}

function reportEventsToParent(child, parent) {
	child.on('running', m => parent.emitter.emit('running', m))
	child.on('message', m => parent.emitter.emit('message', m))
	child.on('complete', m => parent.emitter.emit('complete', m))
	child.on('error', m => parent.emitter.emit('error', m))
}

class TaskBase {

	constructor(flow) {		
		Object.defineProperty(this, 'flow', {value: flow})
		//status: 'running|error|complete'
		//message: '',
		//error: error object if any
		//context: context object before execution of this task
		//result: context object after execution of this task
		//executionId: -1,
		//skip: <bool>
		
		//[func]: available only in FuncTask
		//[children]: [], available only in FlowTask
	}
	
	reset(resetSkip) {
		delete this.status
		delete this.message
		delete this.context
		delete this.result
		//delete this.executionId	//need this for "redo from"
		delete this.error
		if (resetSkip)
			delete this.skip
		if (this.children)
			this.children.forEach(t => t.reset(resetSkip))
	}
	
	async run(context, runtime) {
		
		if (!context)
			context = {}

		if (!runtime)
			runtime = {executionId: 1}
		else if (!runtime.executionId)
			runtime.executionId = 1
		
		this.reset(false)

		let _markError = e => {
			if (typeof e !== 'object')
				e = { error: e }
			
			let name = 'easyflow[' + this.id() + ']'
			if (e.name && e.name.indexOf('easyflow[') < 0) {
				e.name = e.name + ' ' + name
			} else
				e.name = name

			if (!e.easyflowContext) {
				Object.defineProperty(e, 'easyflowContext', {
					value: context
				})
			}

			this.error = e			
			this._updateState('error')
			return e
		}

		this.executionId = runtime.executionId++
		if (this.skip)
			return context
		if (this._isCanceled()) {
			let e = new Error('canceled')
			e = _markError(e)
			throw e
		}
		
		this._updateState('running')
		
		try {
			await this._runImpl(context, runtime)
		} catch (e) {
			let err = _markError(e)
			throw err
		}
		
		this._updateState('complete')
		return context
	}
	
	_updateState(state) {
		this.status = state
		
		if (state === 'error' && this.flow.emitter.listeners('error').length === 0)
			console.error(state)
		else
			this.flow.emitter.emit(state, this)
	}
	
	_isCanceled() {
		if (this.flow.canceled)
			return true
		if (this.parent)
			return this.parent._isCanceled()
	}
}

class FlowTask extends TaskBase {
	constructor(flow, items, parallel) {
		super(flow)
		this.title = flow.options.title
		this.parallel = parallel
		
		this.children = []
		for (let i = 0; i < items.length; i++) {
			let t = items[i]
			let sub
			if (t instanceof Easyflow) {
				sub = t.task
				reportEventsToParent(t, flow)				
			} else if (typeof t === 'function') {
				sub = new FuncTask(flow, t)
			} else {
				throw new Error(`Unknown easyflow task type. title=${this.title}, index=${i}, type=${typeof t}, object=${t}`)
			}

			Object.defineProperty(sub, 'parent', { value: this })
			this.children.push(sub)
		}
	}
	
	id() {
		let id = this.flow.options.id
		return id ? id : this.title
	}
	
	async _runImpl(parentContext, runtime) {
		
		let reducedOriginalContext
		let actualContext
		let mapping_in = this.flow.mapping_in
		
		//reduce parent context
		if (mapping_in) {
			reducedOriginalContext = {}
			actualContext = {}
			for (let k in mapping_in) {
				if (!(k in parentContext))
					throw 'Context property not found: ' + k + '. FlowTask.id=' + this.id()
				let v = parentContext[k]				
				reducedOriginalContext[k] = v
				actualContext[mapping_in[k]] = v
			}			
		} else {
			reducedOriginalContext = Object.assign({}, parentContext)
			actualContext = Object.assign({}, parentContext)
		}
		this.context = reducedOriginalContext
		
		Object.defineProperty(reducedOriginalContext, '_parent', { value: parentContext })
		Object.defineProperty(actualContext, '_parent', { value: parentContext })
		
		//run it
		if (this.parallel) {
			let tasks = this.children.map(t => t.run(actualContext, runtime))
			await Promise.all(tasks)
		} else {
			for (let t of this.children)
				await t.run(actualContext, runtime)
		}
		
		//write back to parent context
		let mapping_out = this.flow.mapping_out
		if (mapping_out) {
			for (let k in mapping_out)
				parentContext[k] = actualContext[mapping_out[k]]
		}
	}
}

class FuncTask extends TaskBase {
	constructor(flow, func) {
		super(flow)
		this.func = func
		this.title = func.title ? func.title : '<' + func.name + '>'
	}
	
	id() {
		return this.func.name
	}
	
	async _runImpl(parentContext, runtime) {
		
		if (runtime.startFrom) {
			if (this.executionId < runtime.startFrom) {
				console.log('Fast skip', this.executionId, this.title)
				return
			}
		}
		
		//reduce context
		let args = getArgs(this.func)
		let params = []
		let ctx = {}
		for (let name of args) {
			
			if (!(name in parentContext))
				throw 'Context property not found: ' + name + '. FuncTask.id=' + this.id()
			
			let v = parentContext[name]
			params.push(v)
			ctx[name] = v
		}
		this.context = ctx

		let _task_this = {
			msg: (...args) => {
				this.message = util.format.apply(null, args)
				this.flow.emitter.emit('message', this)
			},
			skip: (...ids) => this.flow.skip(ids)
		}
		
		this.result = await this.func.apply(_task_this, params)		//let it throw out, if any exception
		Object.assign(parentContext, this.result)
	}
}

class Easyflow {

	constructor(options, items, parallel) {
		
		this.emitter = new EventEmitter
		
		if (typeof options === 'string')
			options = {title: options}
		this.options = options
		
		this.task = new FlowTask(this, items, parallel)
	}

	async run(context, runtime) {
		try {
			return await this.task.run(context, runtime)
		} catch (e) {
			let errorFlow = this.errorFlow
			if (errorFlow) {
				context = context || {}
				context._error = e
				try {
					if (typeof errorFlow === 'function') {
						await errorFlow(context, e)
					} else {
						reportEventsToParent(errorFlow, this)
						await errorFlow.run(context)
					}
				} catch (e) {
					this.emitter.emit('error', e)
					console.error(`Fail running error flow of easyflow ${this.id()}`, e)
				}
			}
			throw e
		}
	}

	skip(ids) {
		this.task.children.forEach(t => {
			let id = t.id()
			if (ids.indexOf(id) >= 0)
				t.skip = true
		})
	}
	
	in(...mapping) {
		if (mapping.length === 1 && typeof mapping[0] === 'object') {
			this.mapping_in = mapping[0]
			return this
		}
		this.mapping_in = {}
		for (let k of mapping)
			this.mapping_in[k] = k
		return this
	}
	
	out(...mapping) {
		if (mapping.length === 1 && typeof mapping[0] === 'object') {
			this.mapping_out = mapping[0]
			return this
		}
		this.mapping_out = {}
		for (let k of mapping)
			this.mapping_out[k] = k
		return this
	}
	
	error(flow) {
		if (typeof flow !== 'function' && !(flow instanceof Easyflow))
			throw 'Invalid argument type. Expect function or instanceof Easyflow'
		this.errorFlow = flow
		return this
	}
	
	on(event, handler) {
		this.emitter.on(event, handler)
		return this
	}
	
	cancel() {
		this.canceled = true
	}
	
	status() {
		return this.task
	}
}

function easyflow(option, ...tasks) {
    return new Easyflow(option, tasks)
}

easyflow.parallel = function(option, ...tasks) {
    return new Easyflow(option, tasks, true)
}

module.exports = easyflow