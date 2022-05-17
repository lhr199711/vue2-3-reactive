/*
 * @Description:
 * @Date: 2022-05-17 09:42:47
 * @LastEditTime: 2022-05-17 09:51:26
 */
function updateView() {
  console.log("更新视图");
}

// 响应数组变化
let oldArrayPrototype = Array.prototype;
let proto = Object.create(oldArrayPrototype); // 继承
["push", "shift", "unshift"].forEach((method) => {
  proto[method] = function () {
    updateView();
    oldArrayPrototype[method].call(this, ...arguments);
  };
});

function defineReactive(target, key, value) {
  observer(value);
  Object.defineProperty(target, key, {
    get() {
      return value;
    },
    set(newValue) {
      if (newValue !== value) {
        observer(newValue);
        updateView();
        value = newValue;
      }
    },
  });
}

function observer(target) {
  // 如果传进来的数据，不是对象，直接返回
  if (typeof target !== "object" || target == null) {
    return target;
  }
  if (Array.isArray(target)) {
    Object.setPrototypeOf(target, proto);
  }
  for (let key in target) {
    defineReactive(target, key, target[key]);
  }
}

let data = {
  name: "zf",
  obj: {
    num: 1,
  },
  arr: [1, { arr: [1, 2, 3] }],
};
observer(data);
data.arr[1].arr.push(4);

// vue2 响应式的缺陷
// 1. 因为是涉及到递归，如果对象的嵌套层级过深，性能开销较大
// 2. 如果在data中定义的属性，之前不存在的，后面新增的属性，无法被observer，就无法成为响应式
// 3. 删除掉现有属性也无法成为响应式
