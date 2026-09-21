# Creational Design Patterns

Creational patterns deal with object creation mechanisms, trying to create objects in a manner suitable to the situation.

---

## 1. Singleton Pattern

### Problem
You need exactly one instance of a class (e.g., database connection, configuration manager, logger).

### Bad Example
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

### Solution
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

### JavaScript Implementation
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

### When to Use
- **Use**: Logger, configuration, connection pool, cache
- **Don't Use**: When you need multiple instances, or for simple utilities (use module instead)

### Pros & Cons
✅ Controlled access to single instance
✅ Lazy initialization
❌ Global state (can make testing harder)
❌ Can violate Single Responsibility Principle

---

## 2. Factory Pattern

### Problem
You need to create objects without specifying exact class. Creation logic is complex or depends on conditions.

### Bad Example
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

### Solution
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

### JavaScript Implementation
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

### When to Use
- **Use**: When you don't know exact types beforehand, or creation logic is complex
- **Don't Use**: For simple object creation with no variation

### Pros & Cons
✅ Loose coupling between client and products
✅ Easy to add new products (Open/Closed Principle)
✅ Centralized creation logic
❌ Can introduce many classes

---

## 3. Abstract Factory Pattern

### Problem
You need to create families of related objects without specifying concrete classes.

### Example: UI Theme Factory

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

### When to Use
- **Use**: When you need families of related objects to work together
- **Don't Use**: When you only have one product family

---

## 4. Builder Pattern

### Problem
You need to construct complex objects step by step. Constructor has too many parameters.

### Bad Example
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

### Solution
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

### JavaScript Implementation
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

### When to Use
- **Use**: Many constructor parameters, step-by-step construction, immutable objects
- **Don't Use**: Simple objects with few parameters

### Pros & Cons
✅ Readable, fluent interface
✅ Control over construction process
✅ Can create different representations
❌ More code (requires builder class)

---

## 5. Prototype Pattern

### Problem
You need to copy existing objects without making code dependent on their classes.

### Solution
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

### JavaScript Implementation
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

### When to Use
- **Use**: Expensive object creation, need many similar objects
- **Don't Use**: Simple objects, shallow copying suffices

---

## Pattern Selection Guide

| Pattern | Use When | Example Use Cases |
|---------|----------|-------------------|
| **Singleton** | Need exactly one instance | Logger, Config, DB connection pool |
| **Factory** | Don't know exact class at compile time | Plugin system, document types |
| **Abstract Factory** | Need families of related objects | UI themes, cross-platform apps |
| **Builder** | Complex construction with many parameters | Query builders, document builders |
| **Prototype** | Expensive creation, need copies | Game entities, graphic editors |

---

## Anti-Patterns to Avoid

### 1. Overusing Singleton
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

### 2. God Factory
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

### 3. Premature Abstraction
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

## Key Takeaways

1. **Singleton**: One instance, global access
2. **Factory**: Decouple object creation from usage
3. **Abstract Factory**: Families of related objects
4. **Builder**: Step-by-step complex object construction
5. **Prototype**: Clone existing objects

**Remember**: Use patterns when they solve a real problem. Don't force patterns where they don't fit!
