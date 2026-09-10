extends Node2D
## Main scene controller: spawns coins deterministically, tracks score,
## and demonstrates a pause menu that stays interactive while paused.

const COIN_COUNT := 8
const ARENA := Rect2(60, 60, 840, 420)

const CoinScene := preload("res://scenes/coin.tscn")

var score := 0

@onready var player: Player = $Player
@onready var score_label: Label = $HUD/ScoreLabel
@onready var pause_menu: ColorRect = $HUD/PauseMenu


func _ready() -> void:
	seed(12345)  # A3: deterministic randomness
	player.collected.connect(_on_collected)
	for i in COIN_COUNT:
		var coin := CoinScene.instantiate()
		coin.position = Vector2(
			randf_range(ARENA.position.x, ARENA.end.x),
			randf_range(ARENA.position.y, ARENA.end.y)
		)
		add_child(coin)
	_update_score()


func _unhandled_input(event: InputEvent) -> void:
	if event.is_action_pressed("pause"):
		var paused := not get_tree().paused
		get_tree().paused = paused
		pause_menu.visible = paused


func _on_collected(total: int) -> void:
	score = total
	_update_score()
	if score >= COIN_COUNT:
		score_label.text = "You win! All %d coins collected." % score


func _update_score() -> void:
	score_label.text = "Coins: %d / %d" % [score, COIN_COUNT]
