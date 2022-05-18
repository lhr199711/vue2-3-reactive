/*
 * @Description:
 * @Date: 2022-05-17 13:49:01
 * @LastEditTime: 2022-05-18 10:54:42
 */
// 判断是对象或者数组
function isObject(obj) {
  return typeof obj === "object" && obj !== null;
}

function hasOwn(target, key) {
  return target.hasOwnProperty(key);
}

//weakmap是es6语法 与map的区别是 1.weakmap只能用对象或数组做键  2.不会干扰垃圾回收机制，很容易被回收
let toProxy = new WeakMap(); // 原对象=>代理过的对象 的映射表
let toRaw = new WeakMap(); // 代理过的对象=>原对象 的映射表

function createReactiveObj(data) {
  if (!isObject(data)) return data;

  let proxy = toProxy.get(data);
  if (proxy) {
    // 防止文件底部的情况1
    return proxy;
  }
  if (toRaw.has(data)) {
    // 防止文件底部的情况2
    return data;
  }

  let baseHandler = {
    // 这里源码应该劫持了5个属性
    get(target, key, receiver) {
      // receiver 全等于被new Proxy生成的对象，也就是被代理的对象
      // return target[key];  一般这样写也可以，但是proxy配合Reflect使用更加舒服(详情参考es6)
      // Reflect 也是es6新增的语法，它的出现像是为了解决Object的一些不合理之处（比如返回值以及写法）,目前它的一些api实现的功能其实与Object是一样的
      let res = Reflect.get(target, key, receiver);

      track(target, key);

      return isObject(res) ? reactive(res) : res; // 注意这句，这是是实现递归的关键。不同于vue2的全递归，这里是取值，需要才递归
    },
    set(target, key, value, receiver) {
      console.log(key, value, "wrapper");
      let hadKey = hasOwn(target, key);
      let oldValue = target[key];
      let res = Reflect.set(target, key, value, receiver); // 这个api返回一个bool，表示对象到底设置成功没有
      if (!hadKey) {
        trigger(target, key);
        console.log("add属性");
      } else if (oldValue !== value) {
        // 屏蔽无意义的修改，比如proxy 是数组的时候，push会触发两次set方法
        trigger(target, key);
        console.log("修改属性");
      }
      // target[key] = value; 一般这样写也可以，但是比如原生对象不能被改写，不会报错
      return res;
    },
    deleteProperty(target, key) {
      let res = Reflect.deleteProperty(target, key); // 这个api返回一个bool，表示对象到底删除成功没有
      return res;
    },
  };
  // proxy 是es6语法 提供了一种拦截或者叫代理机制，用户对对象或者读取设置等操作的时候，会经过这个代理，
  let observed = new Proxy(data, baseHandler);
  toProxy.set(data, observed);
  toRaw.set(observed, data);
  return observed;
}

function reactive(data) {
  return createReactiveObj(data);
}

// 依赖收集

let activeEffectStacks = []; // 栈型结构

let targetsMap = new WeakMap();
function track(target, key) {
  let effect = activeEffectStacks[activeEffectStacks.length - 1];
  if (effect) {
    let depsMap = targetsMap.get(target);
    if (!depsMap) {
      targetsMap.set(target, (depsMap = new Map()));
    }
    let deps = depsMap.get(key);
    if (!deps) {
      depsMap.set(key, (deps = new Set()));
    }
    if (!deps.has(effect)) {
      deps.add(effect);
    }
  }
}

function trigger(target, type, key) {
  let depsMap = targetsMap.get(target);
  if (depsMap) {
    let deps = depsMap.get(key);
    if (deps) {
      deps.forEach((effect) => {
        effect();
      });
    }
  }
}

function effect(fn) {
  let effect = createReactiveEffect(fn);
  effect();
}

function createReactiveEffect(fn) {
  let effect = function () {
    return run(effect, fn);
  };
  return effect;
}

function run() {
  try {
    activeEffectStacks.push(effect);
    fn();
  } finally {
    activeEffectStacks.pop();
  }
}
let proxy = reactive({ name: "harry" });
effect(() => {
  // 响应式数据发生变化后，会触发effect函数的回调函数
  console.log(obj.name);
});
proxy.name = "test";

// let obj = { name: "harry" };
// let arr = [1, 2, 3];
// let proxy = reactive(arr);
// proxy.push(4);

// 情况1  后续又多次调用reactive 普通对象的情况 参照上面代码 会多次new Proxy
// let newProxy = reactive(obj);

// 情况2  后续又多次调用reactive proxy对象的情况
// let proxy = reactive(proxy);
