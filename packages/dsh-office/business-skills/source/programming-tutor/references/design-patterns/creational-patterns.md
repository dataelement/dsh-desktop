# 创建型设计模式

创建型模式处理对象的创建机制，以适合当前情况的方式来创建对象。

---

## 1. 单例模式

### 问题
你需要一个类只有一个实例（例如数据库连接、配置管理器、日志记录器）。

### 反面示例
```python
# Multiple instances can be created
class DatabaseConnection:
    def __init__(self):
        self.connection = self.connect()

    def connect(self):
        print("Connecting to database...")
        return "DB Connection"

# Problem: Multiple connections created
db1 = DatabaseConnection()
db2 = DatabaseConnection()
print(db1 is db2)  # False - different instances!
```

### 解决方案
```python
class Singleton:
    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance

class DatabaseConnection(Singleton):
    def __init__(self):
        if not hasattr(self, 'initialized'):
            self.connection = self.connect()
            self.initialized = True

    def connect(self):
        print("Connecting to database...")
        return "DB Connection"

# Usage
db1 = DatabaseConnection()
db2 = DatabaseConnection()
print(db1 is db2)  # True - same instance!
```

### JavaScript 实现
```javascript
class DatabaseConnection {
    constructor() {
        if (DatabaseConnection.instance) {
            return DatabaseConnection.instance;
        }

        this.connection = this.connect();
        DatabaseConnection.instance = this;
    }

    connect() {
        console.log("Connecting to database...");
        return "DB Connection";
    }
}

// Usage
const db1 = new DatabaseConnection();
const db2 = new DatabaseConnection();
console.log(db1 === db2);  // true
```

### 何时使用
- **适用场景**：日志记录器、配置管理、连接池、缓存
- **不适用场景**：当你需要多个实例时，或者对于简单工具类（改用模块即可）

### 优缺点
✅ 对单一实例的受控访问
✅ 延迟初始化
❌ 全局状态（可能让测试更困难）
❌ 可能违反单一职责原则

---

## 2. 工厂模式

### 问题
你需要在不指定具体类的情况下创建对象。创建逻辑复杂或依赖于条件。

### 反面示例
```python
# Client code knows about all concrete classes
class Dog:
    def speak(self):
        return "Woof!"

class Cat:
    def speak(self):
        return "Meow!"

# Client has to know which class to instantiate
def get_pet(pet_type):
    if pet_type == "dog":
        return Dog()
    elif pet_type == "cat":
        return Cat()
    # Adding new pet requires modifying this function!
```

### 解决方案
```python
from abc import ABC, abstractmethod

# Abstract product
class Animal(ABC):
    @abstractmethod
    def speak(self):
        pass

# Concrete products
class Dog(Animal):
    def speak(self):
        return "Woof!"

class Cat(Animal):
    def speak(self):
        return "Meow!"

class Bird(Animal):
    def speak(self):
        return "Tweet!"

# Factory
class AnimalFactory:
    @staticmethod
    def create_animal(animal_type):
        animals = {
            'dog': Dog,
            'cat': Cat,
            'bird': Bird
        }

        animal_class = animals.get(animal_type.lower())
        if animal_class:
            return animal_class()
        raise ValueError(f"Unknown animal type: {animal_type}")

# Usage
factory = AnimalFactory()
pet = factory.create_animal('dog')
print(pet.speak())  # Woof!
```

### JavaScript 实现
```javascript
class Animal {
    speak() {
        throw new Error("Method must be implemented");
    }
}

class Dog extends Animal {
    speak() {
        return "Woof!";
    }
}

class Cat extends Animal {
    speak() {
        return "Meow!";
    }
}

class AnimalFactory {
    static createAnimal(animalType) {
        const animals = {
            dog: Dog,
            cat: Cat
        };

        const AnimalClass = animals[animalType.toLowerCase()];
        if (AnimalClass) {
            return new AnimalClass();
        }
        throw new Error(`Unknown animal type: ${animalType}`);
    }
}

// Usage
const pet = AnimalFactory.createAnimal('dog');
console.log(pet.speak());  // Woof!
```

### 何时使用
- **适用场景**：事先不知道具体类型，或创建逻辑复杂
- **不适用场景**：简单的对象创建，没有变体

### 优缺点
✅ 客户端与产品之间松耦合
✅ 容易添加新产品（开闭原则）
✅ 集中的创建逻辑
❌ 可能引入过多类

---

## 3. 抽象工厂模式

### 问题
你需要在不指定具体类的情况下创建一系列相关的对象。

### 示例：UI 主题工厂

```python
from abc import ABC, abstractmethod

# Abstract products
class Button(ABC):
    @abstractmethod
    def render(self):
        pass

class Checkbox(ABC):
    @abstractmethod
    def render(self):
        pass

# Concrete products - Light theme
class LightButton(Button):
    def render(self):
        return "Rendering light button"

class LightCheckbox(Checkbox):
    def render(self):
        return "Rendering light checkbox"

# Concrete products - Dark theme
class DarkButton(Button):
    def render(self):
        return "Rendering dark button"

class DarkCheckbox(Checkbox):
    def render(self):
        return "Rendering dark checkbox"

# Abstract factory
class UIFactory(ABC):
    @abstractmethod
    def create_button(self):
        pass

    @abstractmethod
    def create_checkbox(self):
        pass

# Concrete factories
class LightThemeFactory(UIFactory):
    def create_button(self):
        return LightButton()

    def create_checkbox(self):
        return LightCheckbox()

class DarkThemeFactory(UIFactory):
    def create_button(self):
        return DarkButton()

    def create_checkbox(self):
        return DarkCheckbox()

# Client code
def create_ui(factory: UIFactory):
    button = factory.create_button()
    checkbox = factory.create_checkbox()
    return button.render(), checkbox.render()

# Usage
light_factory = LightThemeFactory()
print(create_ui(light_factory))

dark_factory = DarkThemeFactory()
print(create_ui(dark_factory))
```

### 何时使用
- **适用场景**：当你需要一系列相关对象协同工作时
- **不适用场景**：当只有一个产品族时

---

## 4. 建造者模式

### 问题
你需要逐步构建复杂对象。构造函数参数过多。

### 反面示例
```python
# Constructor with too many parameters
class Pizza:
    def __init__(self, size, cheese=False, pepperoni=False,
                 mushrooms=False, onions=False, bacon=False,
                 ham=False, pineapple=False):
        self.size = size
        self.cheese = cheese
        self.pepperoni = pepperoni
        # ... many parameters

# Hard to read, easy to make mistakes
pizza = Pizza(12, True, True, False, True, False, True, False)
```

### 解决方案
```python
class Pizza:
    def __init__(self, size):
        self.size = size
        self.cheese = False
        self.pepperoni = False
        self.mushrooms = False
        self.onions = False
        self.bacon = False

    def __str__(self):
        toppings = []
        if self.cheese:
            toppings.append("cheese")
        if self.pepperoni:
            toppings.append("pepperoni")
        if self.mushrooms:
            toppings.append("mushrooms")
        if self.onions:
            toppings.append("onions")
        if self.bacon:
            toppings.append("bacon")

        return f"{self.size}\" pizza with {', '.join(toppings)}"

class PizzaBuilder:
    def __init__(self, size):
        self.pizza = Pizza(size)

    def add_cheese(self):
        self.pizza.cheese = True
        return self

    def add_pepperoni(self):
        self.pizza.pepperoni = True
        return self

    def add_mushrooms(self):
        self.pizza.mushrooms = True
        return self

    def add_onions(self):
        self.pizza.onions = True
        return self

    def add_bacon(self):
        self.pizza.bacon = True
        return self

    def build(self):
        return self.pizza

# Usage - much more readable!
pizza = (PizzaBuilder(12)
         .add_cheese()
         .add_pepperoni()
         .add_mushrooms()
         .build())

print(pizza)  # 12" pizza with cheese, pepperoni, mushrooms
```

### JavaScript 实现
```javascript
class Pizza {
    constructor(size) {
        this.size = size;
        this.toppings = [];
    }

    toString() {
        return `${this.size}" pizza with ${this.toppings.join(', ')}`;
    }
}

class PizzaBuilder {
    constructor(size) {
        this.pizza = new Pizza(size);
    }

    addCheese() {
        this.pizza.toppings.push('cheese');
        return this;
    }

    addPepperoni() {
        this.pizza.toppings.push('pepperoni');
        return this;
    }

    addMushrooms() {
        this.pizza.toppings.push('mushrooms');
        return this;
    }

    build() {
        return this.pizza;
    }
}

// Usage
const pizza = new PizzaBuilder(12)
    .addCheese()
    .addPepperoni()
    .addMushrooms()
    .build();

console.log(pizza.toString());
```

### 何时使用
- **适用场景**：构造函数参数多、需要逐步构建、不可变对象
- **不适用场景**：参数少的简单对象

### 优缺点
✅ 可读性好，流畅的接口
✅ 对构建过程的控制
✅ 可以创建不同的表示
❌ 更多代码（需要建造者类）

---

## 5. 原型模式

### 问题
你需要复制现有对象，且不让代码依赖于它们的类。

### 解决方案
```python
import copy

class Prototype:
    def clone(self):
        """Deep copy of the object."""
        return copy.deepcopy(self)

class Shape(Prototype):
    def __init__(self, shape_type, color):
        self.shape_type = shape_type
        self.color = color
        self.coordinates = []

    def __str__(self):
        return f"{self.color} {self.shape_type} at {self.coordinates}"

# Usage
original = Shape("Circle", "Red")
original.coordinates = [10, 20]

# Clone
clone = original.clone()
clone.color = "Blue"
clone.coordinates = [30, 40]

print(original)  # Red Circle at [10, 20]
print(clone)     # Blue Circle at [30, 40]
```

### JavaScript 实现
```javascript
class Shape {
    constructor(shapeType, color) {
        this.shapeType = shapeType;
        this.color = color;
        this.coordinates = [];
    }

    clone() {
        const cloned = Object.create(Object.getPrototypeOf(this));
        cloned.shapeType = this.shapeType;
        cloned.color = this.color;
        cloned.coordinates = [...this.coordinates];
        return cloned;
    }

    toString() {
        return `${this.color} ${this.shapeType} at ${this.coordinates}`;
    }
}

// Usage
const original = new Shape("Circle", "Red");
original.coordinates = [10, 20];

const clone = original.clone();
clone.color = "Blue";
clone.coordinates = [30, 40];

console.log(original.toString());  // Red Circle at 10,20
console.log(clone.toString());     // Blue Circle at 30,40
```

### 何时使用
- **适用场景**：对象创建代价高、需要大量相似对象
- **不适用场景**：简单对象、浅拷贝即可满足需求

---

## 模式选择指南

| 模式 | 使用场景 | 示例用例 |
|------|---------|---------|
| **单例** | 需要唯一实例 | 日志记录器、配置、数据库连接池 |
| **工厂** | 编译时不知道具体类 | 插件系统、文档类型 |
| **抽象工厂** | 需要一系列相关对象 | UI 主题、跨平台应用 |
| **建造者** | 复杂构建，参数众多 | 查询构建器、文档构建器 |
| **原型** | 创建代价高，需要副本 | 游戏实体、图形编辑器 |

---

## 应该避免的反模式

### 1. 过度使用单例
```python
# DON'T make everything a singleton
class MathUtils(Singleton):  # Bad - just use a module!
    @staticmethod
    def add(a, b):
        return a + b

# DO use module-level functions
def add(a, b):
    return a + b
```

### 2. 万能工厂
```python
# DON'T create one factory for everything
class GodFactory:
    def create_user(self): ...
    def create_product(self): ...
    def create_order(self): ...
    # ... 50 more methods

# DO use separate factories for different concerns
class UserFactory: ...
class ProductFactory: ...
class OrderFactory: ...
```

### 3. 过早抽象
```python
# DON'T create factory for simple cases
class DogFactory:
    @staticmethod
    def create():
        return Dog()  # Just one simple class

# DO use direct instantiation
dog = Dog()
```

---

## 要点总结

1. **单例**：唯一实例，全局访问
2. **工厂**：将对象创建与使用解耦
3. **抽象工厂**：一系列相关对象
4. **建造者**：逐步构建复杂对象
5. **原型**：克隆现有对象

**记住**：在解决实际问题时使用模式。不要强行套用不适合的模式！
