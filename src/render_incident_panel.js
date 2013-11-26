var escapeHTML = (function() {
	var entityMap = {
		'"' : '&quot;',
		'&' : '&amp;',
		'<' : '&lt;',
		'>' : '&gt;',
		"'" : '&#39;',
		'/' : '&#x2F;'
	};
	return function(text) {
		return text.replace(/["&<>'\/]/g, function(a) {
			return entityMap[a];
		});
	};
}());

function identity(value) {
	return value;
}

function cell(data, field, valueTransform) {
	var transform = valueTransform || identity;
	return '<td class="' + field + '">' + transform(escapeHTML(data[field])) + "</td>";
}

function getLinkTransformer(link) {
	return function(value) {
		var linkPrefix = '<a href="' + link + '">';
		var linkSuffix = "</a>";
		return linkPrefix + value + linkSuffix;
	};
}

function parseLocaltimeFromISO8601(dateString) {
	var parts = dateString.match(/\d+/g);
	return new Date(parts[0], parts[1] - 1, parts[2], parts[3], parts[4], parts[5]);
}

function getDateTransformer(now) {
	return function(dateString) {
		var date = parseLocaltimeFromISO8601(dateString);
		var diff = now - date;
		var msec = diff;
		var hh = Math.floor(msec / 1000 / 60 / 60);
		msec -= hh * 1000 * 60 * 60;
		var mm = Math.floor(msec / 1000 / 60);
		return hh + "h " + mm + "m";
	};
}

var incidentsTableSort = (function() {
	var statusMap = {
		'CRIT' : 0,
		'WARN' : 1,
		'MAINT' : 2,
		'UNKNOWN' : 3,
		'OK' : 4,
	};
	return function(arg1, arg2) {
		var sort = statusMap[arg1.status] - statusMap[arg2.status];
		if (sort != 0) {
			return sort;
		}
		sort = naturalSort(arg1.element.name, arg2.element.name);
		if (sort != 0) {
			return sort;
		}
		sort = naturalSort(arg1.name, arg2.name);
		if (sort != 0) {
			return sort;
		}
		return 0;
	};
}());

function incidentsTableCells(contentType, status, dateTransform) {
	var element = status.element;
	if (contentType == "elements") {
		return cell(status, "status")
				+ cell(element, "name", getLinkTransformer(uptimeGadget.getElementUrls(element.id, element.name).services))
				+ cell(element, "typeName") + cell(element, "typeSubtypeName")
				+ cell(status, "lastTransitionTime", dateTransform);
	}
	return cell(status, "status")
			+ cell(status, "name", getLinkTransformer(uptimeGadget.getElementUrls(element.id, element.name).services))
			+ cell(element, "name") + cell(element, "typeName") + cell(element, "typeSubtypeName")
			+ cell(status, "lastTransitionTime", dateTransform);
}

function renderIncidentsTable(contentType, incidents, elements) {
	var now = new Date();
	var html = '<table class="incidentsTable">';
	var elementIdField = contentType == "elements" ? "id" : "elementId";
	var incidentsAndElements = $.map(incidents, function(incident, i) {
		incident.element = elements[incident[elementIdField]];
		return incident;
	});
	incidentsAndElements.sort(incidentsTableSort);
	$.each(incidentsAndElements, function(i, status) {
		html += '<tr class="incident ' + contentType + " color-text-" + status.status + '">';
		html += incidentsTableCells(contentType, status, getDateTransformer(now));
		html += "</tr>";
	});
	return html + "</table>";
}

function getIncidentsBarChartCellWidth(count, total) {
	var percent = Math.round(count * 100 / total);
	if (percent < 1) {
		percent = 1;
	}
	return percent;
}

function getIncidentsBarChartCell(percent, count, countType) {
	return '<td width="' + percent + '%" class="incidentPanelBarChart ' + countType + '" title="' + count + '">&nbsp;</td>';
}

function renderIncidentsBarChartPercentages(counts) {
	var total = counts.CRIT + counts.OTHER + counts.OK;
	if (total == 0) {
		return '<td width="100%" class="incidentPanelBarChart color-text-OK OK"></td>';
	}
	var html = '';
	var critWidth = 0;
	if (counts.CRIT > 0) {
		critWidth = getIncidentsBarChartCellWidth(counts.CRIT, total);
		html += getIncidentsBarChartCell(critWidth, counts.CRIT, 'color-text-CRIT CRIT');
	}
	var otherWidth = 0;
	if (counts.OTHER > 0) {
		otherWidth = getIncidentsBarChartCellWidth(counts.OTHER, total);
		html += getIncidentsBarChartCell(otherWidth, counts.OTHER, 'color-text-WARN OTHER');
	}
	html += getIncidentsBarChartCell((100 - critWidth - otherWidth), counts.OK, 'color-text-OK OK');
	return html;
}
