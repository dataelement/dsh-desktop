# 面向可测试性的接口设计

好的接口让测试变得自然：

1. **接受依赖，不要自己创建**

   ```typescript
   // 可测试
   function processOrder(order, paymentGateway) {}

   // 难以测试
   function processOrder(order) {
     const gateway = new StripeGateway();
   }
   ```

2. **返回结果，不要产生副作用**

   ```typescript
   // 可测试
   function calculateDiscount(cart): Discount {}

   // 难以测试
   function applyDiscount(cart): void {
     cart.total -= discount;
   }
   ```

3. **保持小的接口面积**
   - 方法越少 = 需要的测试越少
   - 参数越少 = 测试的准备工作越简单
