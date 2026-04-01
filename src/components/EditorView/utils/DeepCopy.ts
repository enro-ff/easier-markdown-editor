//手写深拷贝
const deepCopy = (obj: any, hash = new WeakMap<object, any>()) => {
    if (obj === null || obj === undefined || typeof obj !== 'object') return obj;
    if (hash.has(obj)) return hash.get(obj)
    if (Array.isArray(obj)) {
        const newArr: any[] = [];
        hash.set(obj, newArr)
        for (let i = 0; i < obj.length; i++) {
            newArr.push(deepCopy(obj[i], hash))
        }
        return newArr;
    }
    if (obj instanceof Date) {
        const newDate = new Date(obj);
        hash.set(obj, newDate);
        return newDate
    }
    if (obj instanceof Set) {
        const newSet = new Set();
        hash.set(obj, newSet)
        obj.forEach((key,) => {
            key = deepCopy(key, hash);
            newSet.add(key);
        })
        return newSet;
    }
    if (obj instanceof Map) {
        const newMap = new Map();
        hash.set(obj, newMap);
        obj.forEach((value, key) => {
            key = deepCopy(key, hash);
            value = deepCopy(value, hash);
            newMap.set(key, value)
        })
        return newMap;
    }
    if(obj instanceof RegExp){
        const newReg = RegExp(obj);
        hash.set(obj, newReg);
        return newReg
    }
    const newObj = {}
    hash.set(obj, newObj)
    const keys = obj.keys
    keys.forEach((key: any) => {
        key = deepCopy(key, hash)
        const value = deepCopy(obj[key])
        newObj[key] = value
    })
    return newObj
}

export default deepCopy;