
let hook
if (localStorage) {
	hook = {
	}
} else {
	hook = {
		get: function (oTarget, sKey) {
			return oTarget[sKey] || oTarget.getItem(sKey) || undefined
		},
		set: function (oTarget, sKey, vValue) {
			if (sKey in oTarget) { return false }
			return oTarget.setItem(sKey, vValue);
		},
		deleteProperty: function (oTarget, sKey) {
			if (sKey in oTarget) { return false }
			return oTarget.removeItem(sKey)
		},
		enumerate: function (oTarget, sKey) {
			return oTarget.keys()
		},
		ownKeys: function (oTarget, sKey) {
			return oTarget.keys()
		},
		has: function (oTarget, sKey) {
			return sKey in oTarget || oTarget.hasItem(sKey)
		},
		defineProperty: function (oTarget, sKey, oDesc) {
			if (oDesc && 'value' in oDesc) { oTarget.setItem(sKey, oDesc.value) }
			return oTarget
		},
		getOwnPropertyDescriptor: function (oTarget, sKey) {
			var vValue = oTarget.getItem(sKey)
			return vValue ? {
				value: vValue,
				writable: true,
				enumerable: true,
				configurable: false
			} : undefined
		},
	}
}

let local_store = new Proxy({}, hook)


module.exports = local_store