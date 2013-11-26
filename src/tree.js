function Tree(data) {
	this.firstChild;
	this.nextSibling;
	this.data = data;

	this.addChild = function(child, sort) {
		var next = this.firstChild;
		if (!next) {
			this.firstChild = child;
			return;
		}
		if (sort && sort(child.data, next.data) < 0) {
			this.firstChild = child;
			this.firstChild.nextSibling = next;
			return;
		}
		while (next.nextSibling) {
			if (sort && sort(child.data, next.nextSibling.data) < 0) {
				var after = next.nextSibling;
				next.nextSibling = child;
				child.nextSibling = after;
				return;
			}
			next = next.nextSibling;
		}
		next.nextSibling = child;
	};
}

function tree_walk(tree, visitor, depth) {
	if (!tree) {
		return;
	}
	depth = depth || 0;
	visitor(tree.data, depth);
	tree = tree.firstChild;
	depth++;
	while (tree) {
		tree_walk(tree, visitor, depth);
		tree = tree.nextSibling;
	}
}
