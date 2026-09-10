extends Area2D
## Shape-only coin. Reports pickup through the body_entered signal.


func _ready() -> void:
	body_entered.connect(_on_body_entered)


func _on_body_entered(body: Node2D) -> void:
	if body is Player:
		body.collect(self)
