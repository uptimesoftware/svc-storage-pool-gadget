function groupNameSort(group1, group2) {
	return naturalSort(group1.name, group2.name);
}

function getAllGroups() {
	var deferred = UPTIME.pub.gadgets.promises.defer();
	$.ajax("/api/v1/groups", {
		cache : false
	}).done(function(data, textStatus, jqXHR) {
		deferred.resolve(data);
	}).fail(function(jqXHR, textStatus, errorThrown) {
		deferred.reject(UPTIME.pub.errors.toDisplayableJQueryAjaxError(jqXHR, textStatus, errorThrown, this));
	});
	return deferred.promise;
}

function buildGroupTree(groups) {
	var treeNodes = {};
	var root = new Tree();
	$.each(groups, function(i, group) {
		var tree = treeNodes[group.id];
		if (!tree) {
			tree = new Tree(group);
			treeNodes[group.id] = tree;
		} else {
			tree.data = group;
		}
		if (group.groupId == null) {
			root.addChild(tree, groupNameSort);
			return;
		}
		var parentTree = treeNodes[group.groupId];
		if (!parentTree) {
			parentTree = new Tree();
			treeNodes[group.groupId] = parentTree;
		}
		parentTree.addChild(tree, groupNameSort);
	});
	return {
		treeNodes : treeNodes,
		rootTree : root
	};
}

function getGroupTree(groupId, groups) {
	var groupTreeInfo = buildGroupTree(groups);
	if (groupId < 0) {
		return groupTreeInfo.rootTree;
	}
	return groupTreeInfo.treeNodes[groupId];
}

function getIndentPrefix(prefix, repeat) {
	var repeatedPrefix = "";
	var indent = repeat;
	while (indent-- > 0) {
		repeatedPrefix += prefix;
	}
	return repeatedPrefix;
}

function getGroupNames(groupId, groupTree) {
	var groups = [];
	var depthOffset = (groupId < 0) ? -1 : 0;
	tree_walk(groupTree, function(group, depth) {
		if (!group) {
			return;
		}
		groups.push({
			id : group.id,
			name : getIndentPrefix("-", depth + depthOffset) + group.name
		});
	});
	return groups;
}

function createGroupFilter(groupIds) {
	var deferred = UPTIME.pub.gadgets.promises.defer();
	$.ajax("/api/v1/groups/filter", {
		cache : false,
		type : 'Post',
		contentType : 'application/json',
		data : JSON.stringify({
			ids : groupIds
		}),
		processData : false,
		dataType : 'json'
	}).done(function(data, textStatus, jqXHR) {
		deferred.resolve(data);
	}).fail(function(jqXHR, textStatus, errorThrown) {
		deferred.reject(UPTIME.pub.errors.toDisplayableJQueryAjaxError(jqXHR, textStatus, errorThrown, this));
	});
	return deferred.promise;
}

function getGroupStatuses(groupIds, statusType) {
	var statuses = [];
	return createGroupFilter(groupIds).then(function(filterId) {
		var deferred = UPTIME.pub.gadgets.promises.defer();
		$.ajax("/api/v1/groups/filter/" + filterId.id + "/status", {
			cache : false
		}).done(function(data, textStatus, jqXHR) {
			deferred.resolve(data);
		}).fail(function(jqXHR, textStatus, errorThrown) {
			deferred.reject(UPTIME.pub.errors.toDisplayableJQueryAjaxError(jqXHR, textStatus, errorThrown, this));
		});
		return deferred.promise;
	}).then(function(allData) {
		$.each(allData, function(i, data) {
			statuses.push.apply(statuses, data[statusType]);
		});
		return statuses;
	});
}

function getStatusesIn(groupId, idName, groupTree) {
	if (!groupId) {
		return UPTIME.pub.gadgets.promises.reject("Internal error: getStatusesIn(); groupId must be defined.");
	}
	if (idName != "elements" && idName != "monitors") {
		return UPTIME.pub.gadgets.promises.reject("Internal error: getStatusesIn(); idName must be either elements or monitors.");
	}
	var statusType = (idName == "elements") ? "elementStatus" : "monitorStatus";
	if (!groupTree) {
		return UPTIME.pub.gadgets.promises.reject("Internal error: getStatusesIn(); group tree must exist.");
	}
	var groupIds = [];
	tree_walk(groupTree, function(group) {
		if (!group) {
			return;
		}
		groupIds.push(group.id);
	});
	var deferred = UPTIME.pub.gadgets.promises.defer();
	getGroupStatuses(groupIds, statusType).then(function(statuses) {
		deferred.resolve(statuses);
	}, function(jqXHR, textStatus, errorThrown) {
		deferred.reject(UPTIME.pub.errors.toDisplayableJQueryAjaxError(jqXHR, textStatus, errorThrown, this));
	});
	return deferred.promise;
}

function createElementFilter(ids) {
	var deferred = UPTIME.pub.gadgets.promises.defer();
	$.ajax("/api/v1/elements/filter", {
		cache : false,
		type : 'Post',
		contentType : 'application/json',
		data : JSON.stringify({
			ids : ids
		}),
		processData : false,
		dataType : 'json'
	}).done(function(data, textStatus, jqXHR) {
		deferred.resolve(data);
	}).fail(function(jqXHR, textStatus, errorThrown) {
		deferred.reject(UPTIME.pub.errors.toDisplayableJQueryAjaxError(jqXHR, textStatus, errorThrown, this));
	});
	return deferred.promise;
}

function getElements(ids) {
	if (!ids) {
		return UPTIME.pub.gadgets.promises.reject("Internal error: getElements(); ids must be defined.");
	}
	return createElementFilter(ids).then(function(filterId) {
		var deferred = UPTIME.pub.gadgets.promises.defer();
		$.ajax("/api/v1/elements/filter/" + filterId.id, {
			cache : false
		}).done(function(data, textStatus, jqXHR) {
			deferred.resolve(data);
		}).fail(function(jqXHR, textStatus, errorThrown) {
			deferred.reject(UPTIME.pub.errors.toDisplayableJQueryAjaxError(jqXHR, textStatus, errorThrown, this));
		});
		return deferred.promise;
	}).then(function(allData) {
		var elements = {};
		$.each(allData, function(i, data) {
			elements[data.id] = data;
		});
		return elements;
	});
}

function uniq(arr) {
	var seen = {};
	return $.map(arr, function(item, i) {
		if (seen[item]) {
			return null;
		}
		seen[item] = 1;
		return item;
	});
}

function shouldIgnore(status, ignorePowerStateOff) {
	return !status.isMonitored || (typeof status.isHidden === 'boolean' && status.isHidden)
			|| (ignorePowerStateOff && (status.powerState && status.powerState == "Off"));
}

function getIncidentsIn(groupId, idName, ignorePowerStateOff) {
	if (!groupId) {
		return UPTIME.pub.gadgets.promises.reject("Internal error: getIncidentsIn(); groupId must be defined.");
	}
	if (idName != "elements" && idName != "monitors") {
		return UPTIME.pub.gadgets.promises
				.reject("Internal error: getIncidentsIn(); idName must be either elements or monitors.");
	}
	var idField = (idName == "elements") ? "id" : "elementId";
	var statusCounts = {
		CRIT : 0,
		OTHER : 0,
		OK : 0
	};
	var statusesToShow = [];
	var groupNames;
	return getAllGroups().then(function(groups) {
		return getGroupTree(groupId, groups);
	}).then(function(groupTree) {
		groupNames = getGroupNames(groupId, groupTree);
		return getStatusesIn(groupId, idName, groupTree).then(function(statuses) {
			$.each(statuses, function(i, status) {
				if (shouldIgnore(status, ignorePowerStateOff)) {
					return;
				}
				if ("OK" == status.status) {
					statusCounts.OK++;
				} else if ("CRIT" == status.status) {
					statusesToShow.push(status);
					statusCounts.CRIT++;
				} else {
					statusesToShow.push(status);
					statusCounts.OTHER++;
				}
			});
			var elementIds = uniq($.map(statusesToShow, function(status, i) {
				return status[idField];
			}));
			return getElements(elementIds);
		}).then(function(elems) {
			return {
				incidents : statusesToShow,
				elements : elems,
				statusCounts : statusCounts,
				groupNames : groupNames
			};
		});
	});
}
