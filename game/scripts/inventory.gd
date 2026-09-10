class_name Inventory
extends RefCounted
## Pure logic, no scene tree dependency (Level 2 target).

var _items: Dictionary = {}


func add(item: String, amount: int = 1) -> void:
	if amount <= 0:
		return
	_items[item] = _items.get(item, 0) + amount


func count(item: String) -> int:
	return _items.get(item, 0)


func remove(item: String, amount: int = 1) -> bool:
	var current := count(item)
	if amount <= 0 or current < amount:
		return false
	var left := current - amount
	if left == 0:
		_items.erase(item)
	else:
		_items[item] = left
	return true


func is_empty() -> bool:
	return _items.is_empty()
