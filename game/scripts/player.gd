class_name Player
extends CharacterBody2D
## Shape-only player. Top-down movement, no gravity.

const SPEED := 300.0

var inventory := Inventory.new()
var coins_collected := 0

@onready var visual: ColorRect = $Visual


func _physics_process(_delta: float) -> void:
	var dir := Input.get_vector("move_left", "move_right", "move_up", "move_down")
	velocity = dir * SPEED
	move_and_slide()


func collect(coin: Node2D) -> void:
	coins_collected += 1
	inventory.add("coin")
	coin.queue_free()
	collected.emit(coins_collected)


signal collected(total: int)
