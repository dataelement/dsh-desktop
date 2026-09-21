# 什么时候该用 Mock

只在**系统边界**上使用 mock：

- 外部 API（支付、邮件等）
- 数据库（有时候——更推荐用测试数据库）
- 时间/随机数
- 文件系统（有时候）

不要 mock：

- 你自己的类/模块
- 内部协作者
- 任何你能控制的东西

## 面向可 Mock 性的设计

在系统边界处，设计容易 mock 的接口：

**1. 使用依赖注入**

把外部依赖传进来，而不是在内部创建：

```typescript
// 容易 mock
function processPayment(order, paymentClient) {
  return paymentClient.charge(order.total);
}

// 难以 mock
function processPayment(order) {
  const client = new StripeClient(process.env.STRIPE_KEY);
  return client.charge(order.total);
}
```

**2. 优先使用 SDK 风格的接口，而不是通用的 fetch 封装**

为每个外部操作创建专门的函数，而不是一个带条件逻辑的通用函数：

```typescript
// 好：每个函数都可以独立 mock
const api = {
  getUser: (id) => fetch(`/users/${id}`),
  getOrders: (userId) => fetch(`/users/${userId}/orders`),
  createOrder: (data) => fetch('/orders', { method: 'POST', body: data }),
};

// 坏：mock 需要在内部写条件逻辑
const api = {
  fetch: (endpoint, options) => fetch(endpoint, options),
};
```

SDK 风格的好处：
- 每个 mock 只返回一种固定的数据结构
- 测试准备中不需要条件逻辑
- 更容易看出测试覆盖了哪些接口
- 每个接口都有类型安全
