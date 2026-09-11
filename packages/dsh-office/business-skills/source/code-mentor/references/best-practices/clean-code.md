# Clean Code Principles

## Core Principles

### 1. Meaningful Names

**Variables**:
```python
# BAD
d = 10  # What is 'd'?
t = time.time()

# GOOD
elapsed_days = 10
current_timestamp = time.time()
```

**Functions**:
```python
# BAD
def process(data):
    pass

# GOOD
def calculate_user_average_score(user_scores):
    pass
```

**Classes**:
```python
# BAD
class Data:
    pass

# GOOD
class CustomerOrderProcessor:
    pass
```

**Boolean variables** - use predicates:
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

### 2. Functions Should Do One Thing

**BAD** - Multiple responsibilities:
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

**GOOD** - Single responsibility:
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

### 3. Keep Functions Small

**Guideline**: Aim for 10-20 lines per function.

**BAD** - 100+ line function:
```python
def generate_report(users):
    # 100 lines of mixed logic
    # Filtering, sorting, formatting, calculations, file I/O
    pass
```

**GOOD** - Extracted functions:
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

### 4. DRY (Don't Repeat Yourself)

**BAD** - Duplication:
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

**GOOD** - Extract common logic:
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

### 5. Avoid Magic Numbers

**BAD**:
```python
if age > 18:
    can_vote = True

if len(password) < 8:
    raise ValueError("Password too short")
```

**GOOD**:
```python
VOTING_AGE = 18
MIN_PASSWORD_LENGTH = 8

if age > VOTING_AGE:
    can_vote = True

if len(password) < MIN_PASSWORD_LENGTH:
    raise ValueError(f"Password must be at least {MIN_PASSWORD_LENGTH} characters")
```

---

### 6. Error Handling

**BAD** - Bare except, silent failures:
```python
try:
    result = risky_operation()
except:
    pass  # What went wrong?
```

**GOOD** - Specific exceptions, informative messages:
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

### 7. Use Early Returns (Guard Clauses)

**BAD** - Nested conditions:
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

**GOOD** - Early returns:
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

### 8. Comment Why, Not What

**BAD** - Obvious comments:
```python
# Increment i by 1
i += 1

# Loop through users
for user in users:
    pass
```

**GOOD** - Explain non-obvious reasoning:
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

### 9. Keep Indentation Shallow

**BAD** - Deep nesting:
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

**GOOD** - Use early returns, extraction:
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

### 10. Consistent Formatting

**Use a formatter**: Black (Python), Prettier (JavaScript), gofmt (Go)

**Consistency matters**:
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

## SOLID Principles

### S - Single Responsibility Principle

**A class should have one, and only one, reason to change.**

**BAD**:
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

**GOOD**:
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

### O - Open/Closed Principle

**Open for extension, closed for modification.**

**BAD**:
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

**GOOD**:
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

### L - Liskov Substitution Principle

**Subclasses should be substitutable for their base classes.**

**BAD**:
```python
class Bird:
    def fly(self):
        print("Flying")

class Penguin(Bird):
    def fly(self):
        raise Exception("Penguins can't fly!")
```

**GOOD**:
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

### I - Interface Segregation Principle

**Clients should not depend on interfaces they don't use.**

**BAD**:
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

**GOOD**:
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

### D - Dependency Inversion Principle

**Depend on abstractions, not concretions.**

**BAD**:
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

**GOOD**:
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

## Code Smells to Avoid

### 1. Long Parameter List
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

### 2. Primitive Obsession
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

### 3. Feature Envy
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

## Testing Best Practices

### 1. AAA Pattern (Arrange-Act-Assert)
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

### 2. One Assertion Per Test (guideline)
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

### 3. Test Names Should Be Descriptive
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

## Refactoring Checklist

When you see code that needs improvement:

1. **Is it tested?** If not, write tests first
2. **One change at a time** - Refactor incrementally
3. **Run tests after each change** - Ensure nothing breaks
4. **Commit frequently** - Small, focused commits
5. **Don't change behavior** - Refactoring should preserve functionality

---

## Key Takeaways

1. **Names matter** - Spend time choosing good names
2. **Functions should be small** - Aim for 10-20 lines
3. **One responsibility** - Each function/class does one thing well
4. **DRY** - Don't repeat yourself
5. **SOLID** - Follow the five SOLID principles
6. **Early returns** - Reduce nesting with guard clauses
7. **Comment why** - Not what (code shows what)
8. **Test** - Write tests, refactor with confidence

**Remember**: Clean code is not about perfection—it's about making code easier to read, maintain, and extend!
