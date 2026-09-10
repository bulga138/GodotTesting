# Level 2 reference suite. Requires the GdUnit4 addon (see docs/testing/04).
# res://tests/unit/test_inventory_rules.gd
extends GdUnitTestSuite


func test_stacking_two_partial_stacks_merges() -> void:
	var inv := Inventory.new()
	inv.add("coin", 3)
	inv.add("coin", 2)
	assert_int(inv.count("coin")).is_equal(5)


func test_remove_more_than_owned_fails() -> void:
	var inv := Inventory.new()
	inv.add("coin", 2)
	assert_bool(inv.remove("coin", 5)).is_false()
	assert_int(inv.count("coin")).is_equal(2)


func test_remove_last_item_empties_inventory() -> void:
	var inv := Inventory.new()
	inv.add("coin", 1)
	assert_bool(inv.remove("coin", 1)).is_true()
	assert_bool(inv.is_empty()).is_true()
