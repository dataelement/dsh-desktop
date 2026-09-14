# 整洁代码原则

## 核心原则

### 1. 有意义的命名

**变量**：
```python
# BAD
d = 10  # What is 'd'?
t = time.time()

# GOOD
elapsed_days = 10
current_timestamp = time.time()
```

**函数**：
```python
# BAD
def process(data):
    pass

# GOOD
def calculate_user_average_score(user_scores):
    pass
```

**类**：
```python
# BAD
class Data:
    pass

# GOOD
class CustomerOrderProcessor:
    pass
```

**布尔变量** - 使用谓词：
```python
# BAD
flag = True
status = False

# GOOD
is_active = True
has_permission = False
can_edit = True
should_retry = False
```

---

### 2. 函数应只做一件事

**反面示例** - 多种职责：
```python
def process_user_data(user):
    # Validate
    if not user.email:
        raise ValueError("Email required")

    # Transform
    user.name = user.name.upper()

    # Save to database
    db.save(user)

    # Send email
    email_service.send_welcome(user.email)

    # Log
    logger.info(f"User processed: {user.id}")
```

**正面示例** - 单一职责：
```python
def validate_user(user):
    if not user.email:
        raise ValueError("Email required")

def normalize_user_data(user):
    user.name = user.name.upper()
    return user

def save_user(user):
    db.save(user)

def send_welcome_email(email):
    email_service.send_welcome(email)

def process_user_data(user):
    validate_user(user)
    user = normalize_user_data(user)
    save_user(user)
    send_welcome_email(user.email)
    logger.info(f"User processed: {user.id}")
```

---

### 3. 保持函数简短

**指导原则**：每个函数目标控制在 10-20 行。

**反面示例** - 100+ 行的函数：
```python
def generate_report(users):
    # 100 lines of mixed logic
    # Filtering, sorting, formatting, calculations, file I/O
    pass
```

**正面示例** - 提取函数：
```python
def generate_report(users):
    active_users = filter_active_users(users)
    sorted_users = sort_by_activity(active_users)
    report_data = calculate_statistics(sorted_users)
    formatted_report = format_report(report_data)
    save_report(formatted_report)

def filter_active_users(users):
    return [u for u in users if u.is_active]

def sort_by_activity(users):
    return sorted(users, key=lambda u: u.activity_score, reverse=True)
```

---

### 4. DRY（不要重复自己）

**反面示例** - 重复代码：
```python
def calculate_student_grade(math_score, science_score):
    if math_score >= 90:
        math_grade = 'A'
    elif math_score >= 80:
        math_grade = 'B'
    elif math_score >= 70:
        math_grade = 'C'
    else:
        math_grade = 'F'

    if science_score >= 90:
        science_grade = 'A'
    elif science_score >= 80:
        science_grade = 'B'
    elif science_score >= 70:
        science_grade = 'C'
    else:
        science_grade = 'F'

    return math_grade, science_grade
```

**正面示例** - 提取公共逻辑：
```python
def score_to_grade(score):
    if score >= 90:
        return 'A'
    elif score >= 80:
        return 'B'
    elif score >= 70:
        return 'C'
    return 'F'

def calculate_student_grade(math_score, science_score):
    return score_to_grade(math_score), score_to_grade(science_score)
```

---

### 5. 避免魔法数字

**反面示例**：
```python
if age > 18:
    can_vote = True

if len(password) < 8:
    raise ValueError("Password too short")
```

**正面示例**：
```python
VOTING_AGE = 18
MIN_PASSWORD_LENGTH = 8

if age > VOTING_AGE:
    can_vote = True

if len(password) < MIN_PASSWORD_LENGTH:
    raise ValueError(f"Password must be at least {MIN_PASSWORD_LENGTH} characters")
```

---

### 6. 错误处理

**反面示例** - 空的 except，静默失败：
```python
try:
    result = risky_operation()
except:
    pass  # What went wrong?
```

**正面示例** - 具体异常，有信息量的消息：
```python
try:
    result = risky_operation()
except ValueError as e:
    logger.error(f"Invalid value: {e}")
    raise
except ConnectionError as e:
    logger.error(f"Connection failed: {e}")
    # Retry or fallback logic
```

---

### 7. 使用提前返回（守卫子句）

**反面示例** - 嵌套条件：
```python
def process_order(order):
    if order is not None:
        if order.is_valid():
            if order.total > 0:
                if order.customer.has_credit():
                    # Process order
                    return True
    return False
```

**正面示例** - 提前返回：
```python
def process_order(order):
    if order is None:
        return False

    if not order.is_valid():
        return False

    if order.total <= 0:
        return False

    if not order.customer.has_credit():
        return False

    # Process order
    return True
```

---

### 8. 注释写"为什么"，而非"做了什么"

**反面示例** - 显而易见的注释：
```python
# Increment i by 1
i += 1

# Loop through users
for user in users:
    pass
```

**正面示例** - 解释不明显的原因：
```python
# Use binary search because list is always sorted
# and can contain millions of items
index = binary_search(sorted_list, target)

# Cache for 5 minutes to reduce database load
# during peak hours (based on profiling data)
@cache(ttl=300)
def get_popular_products():
    pass
```

---

### 9. 保持浅层缩进

**反面示例** - 深层嵌套：
```python
def process_data(items):
    for item in items:
        if item.is_valid():
            if item.quantity > 0:
                if item.price > 0:
                    if item.in_stock:
                        # Process
                        pass
```

**正面示例** - 使用提前返回和函数提取：
```python
def process_data(items):
    for item in items:
        if not should_process_item(item):
            continue
        process_item(item)

def should_process_item(item):
    return (item.is_valid() and
            item.quantity > 0 and
            item.price > 0 and
            item.in_stock)
```

---

### 10. 一致的格式

**使用格式化工具**：Black（Python）、Prettier（JavaScript）、gofmt（Go）

**一致性很重要**：
```python
# Pick one style and stick to it

# Style 1
def foo(x, y, z):
    return x + y + z

# Style 2
def foo(
    x,
    y,
    z
):
    return x + y + z

# Don't mix them randomly in the same file!
```

---

## SOLID 原则

### S - 单一职责原则

**一个类应该只有一个修改的理由。**

**反面示例**：
```python
class User:
    def __init__(self, name, email):
        self.name = name
        self.email = email

    def save(self):
        # Database logic
        db.execute(f"INSERT INTO users...")

    def send_email(self, message):
        # Email logic
        smtp.send(self.email, message)
```

**正面示例**：
```python
class User:
    def __init__(self, name, email):
        self.name = name
        self.email = email

class UserRepository:
    def save(self, user):
        db.execute(f"INSERT INTO users...")

class EmailService:
    def send_email(self, email, message):
        smtp.send(email, message)
```

---

### O - 开闭原则

**对扩展开放，对修改关闭。**

**反面示例**：
```python
class PaymentProcessor:
    def process(self, payment_type, amount):
        if payment_type == "credit_card":
            # Credit card processing
            pass
        elif payment_type == "paypal":
            # PayPal processing
            pass
        # Adding new type requires modifying this function!
```

**正面示例**：
```python
from abc import ABC, abstractmethod

class PaymentMethod(ABC):
    @abstractmethod
    def process(self, amount):
        pass

class CreditCardPayment(PaymentMethod):
    def process(self, amount):
        # Credit card processing
        pass

class PayPalPayment(PaymentMethod):
    def process(self, amount):
        # PayPal processing
        pass

class PaymentProcessor:
    def process(self, payment_method: PaymentMethod, amount):
        payment_method.process(amount)
```

---

### L - 里氏替换原则

**子类应该可以替代其基类使用。**

**反面示例**：
```python
class Bird:
    def fly(self):
        print("Flying")

class Penguin(Bird):
    def fly(self):
        raise Exception("Penguins can't fly!")
```

**正面示例**：
```python
class Bird:
    def move(self):
        pass

class FlyingBird(Bird):
    def move(self):
        self.fly()

    def fly(self):
        print("Flying")

class Penguin(Bird):
    def move(self):
        self.swim()

    def swim(self):
        print("Swimming")
```

---

### I - 接口隔离原则

**客户端不应该被迫依赖它不使用的接口。**

**反面示例**：
```python
class Worker(ABC):
    @abstractmethod
    def work(self):
        pass

    @abstractmethod
    def eat(self):
        pass

class Robot(Worker):
    def work(self):
        print("Working")

    def eat(self):
        # Robots don't eat!
        raise NotImplementedError
```

**正面示例**：
```python
class Workable(ABC):
    @abstractmethod
    def work(self):
        pass

class Eatable(ABC):
    @abstractmethod
    def eat(self):
        pass

class Human(Workable, Eatable):
    def work(self):
        print("Working")

    def eat(self):
        print("Eating")

class Robot(Workable):
    def work(self):
        print("Working")
```

---

### D - 依赖反转原则

**依赖抽象，而非具体实现。**

**反面示例**：
```python
class MySQLDatabase:
    def save(self, data):
        pass

class UserService:
    def __init__(self):
        self.db = MySQLDatabase()  # Tightly coupled

    def save_user(self, user):
        self.db.save(user)
```

**正面示例**：
```python
class Database(ABC):
    @abstractmethod
    def save(self, data):
        pass

class MySQLDatabase(Database):
    def save(self, data):
        pass

class PostgresDatabase(Database):
    def save(self, data):
        pass

class UserService:
    def __init__(self, database: Database):
        self.db = database  # Depends on abstraction

    def save_user(self, user):
        self.db.save(user)
```

---

## 应该避免的代码坏味道

### 1. 过长的参数列表
```python
# BAD
def create_user(name, email, phone, address, city, state, zip, country):
    pass

# GOOD
class UserData:
    def __init__(self, name, email, contact_info, address):
        pass

def create_user(user_data: UserData):
    pass
```

### 2. 基本类型偏执
```python
# BAD
def calculate_shipping(width, height, depth, weight):
    pass

# GOOD
class Dimensions:
    def __init__(self, width, height, depth):
        self.width = width
        self.height = height
        self.depth = depth

class Package:
    def __init__(self, dimensions, weight):
        self.dimensions = dimensions
        self.weight = weight

def calculate_shipping(package: Package):
    pass
```

### 3. 特性依恋
```python
# BAD - Method in class A uses mostly data from class B
class Order:
    def calculate_total(self, customer):
        discount = customer.discount_rate
        points = customer.loyalty_points
        # Uses customer data extensively
        pass

# GOOD - Move method to class B
class Customer:
    def calculate_order_discount(self, order):
        discount = self.discount_rate
        points = self.loyalty_points
        # Uses own data
        pass
```

---

## 测试最佳实践

### 1. AAA 模式（准备-执行-断言）
```python
def test_user_creation():
    # Arrange
    name = "Alice"
    email = "alice@example.com"

    # Act
    user = User(name, email)

    # Assert
    assert user.name == name
    assert user.email == email
```

### 2. 每个测试一个断言（指导原则）
```python
# AVOID multiple unrelated assertions
def test_user():
    user = User("Alice", "alice@example.com")
    assert user.name == "Alice"
    assert user.email == "alice@example.com"
    assert user.is_valid()
    assert user.created_at is not None

# PREFER focused tests
def test_user_name():
    user = User("Alice", "alice@example.com")
    assert user.name == "Alice"

def test_user_email():
    user = User("Alice", "alice@example.com")
    assert user.email == "alice@example.com"
```

### 3. 测试名称应该具有描述性
```python
# BAD
def test_user():
    pass

# GOOD
def test_user_creation_with_valid_email_succeeds():
    pass

def test_user_creation_with_invalid_email_raises_error():
    pass
```

---

## 重构检查清单

当你发现需要改进的代码时：

1. **有测试吗？** 如果没有，先写测试
2. **一次改一个** - 增量式重构
3. **每次修改后运行测试** - 确保没有破坏功能
4. **频繁提交** - 小而专注的提交
5. **不要改变行为** - 重构应该保持原有功能不变

---

## 要点总结

1. **命名很重要** - 花时间选择好的名字
2. **函数要简短** - 目标 10-20 行
3. **单一职责** - 每个函数/类只做好一件事
4. **DRY** - 不要重复自己
5. **SOLID** - 遵循五大 SOLID 原则
6. **提前返回** - 使用守卫子句减少嵌套
7. **注释写原因** - 而非做了什么（代码本身说明做了什么）
8. **测试** - 写测试，信心十足地重构

**记住**：整洁代码不是追求完美——而是让代码更容易阅读、维护和扩展！
