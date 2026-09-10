# Level 1: DAG solver for the puzzle dependency chart.
# Run: godot --headless --path . --script res://tools/pdc_solver.gd
extends SceneTree


func _init() -> void:
	var path := "res://data/puzzle_dependency_chart.json"
	var parsed = JSON.parse_string(FileAccess.get_file_as_string(path))
	if typeof(parsed) != TYPE_DICTIONARY:
		push_error("PDC not parseable: %s" % path)
		quit(1)
		return
	var nodes: Dictionary = parsed["nodes"]
	var endings: Array = parsed["endings"]
	var initial: String = parsed["initial_state"]

	var errors := 0
	var children := {}
	for node in nodes:
		for dep in nodes[node]:
			if not children.has(dep):
				children[dep] = []
			children[dep].append(node)
	for ending in endings:
		if not _reachable(children, initial, ending):
			push_error("Ending '%s' is unreachable from '%s'" % [ending, initial])
			errors += 1
	if _has_cycle(nodes):
		push_error("PDC contains a cyclic dependency lock")
		errors += 1

	if errors > 0:
		quit(1)
	else:
		print("PDC OK: %d endings reachable, no cycles" % endings.size())
		quit(0)


func _reachable(nodes: Dictionary, from_node: String, target: String) -> bool:
	var seen := {}
	var stack := [from_node]
	while not stack.is_empty():
		var current: String = stack.pop_back()
		if current == target:
			return true
		if seen.has(current):
			continue
		seen[current] = true
		for dep in nodes.get(current, []):
			stack.append(dep)
	return false


func _has_cycle(nodes: Dictionary) -> bool:
	var visited := {}
	for start in nodes:
		if _dfs_cycle(nodes, start, visited):
			return true
	return false


func _dfs_cycle(nodes: Dictionary, current: String, visited: Dictionary) -> bool:
	if visited.get(current, 0) == 1:
		return true
	if visited.get(current, 0) == 2:
		return false
	visited[current] = 1
	for dep in nodes.get(current, []):
		if _dfs_cycle(nodes, dep, visited):
			return true
	visited[current] = 2
	return false
