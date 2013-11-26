if (typeof UPTIME == "undefined") {
	var UPTIME = {};
}

if (typeof UPTIME.ElementStatusSimpleTableChart == "undefined") {
	UPTIME.ElementStatusSimpleTableChart = function(options, displayStatusBar, clearStatusBar) {
		var elementId = null;
		var refreshRate = null;
		var doLastCheckTime = null;
		var doLastTransitionTime = null;
		var doMessage = null;
		var doIsAcknowledged = null;
		var doAcknowledgedComment = null;

		var chartTimer = null;

		if (typeof options == "object") {
			elementId = options.elementId;
			refreshRate = options.refreshRate;
			doLastCheckTime = options.lastCheckTime;
			doLastTransitionTime = options.lastTransitionTime;
			doMessage = options.message;
			doIsAcknowledged = options.isAcknowledged;
			doAcknowledgedComment = options.acknowledgedComment;
		}

		var statusCells = [ getStatusCellSpec("name", nameLink, "Monitor"), getStatusCellSpec("status", directValue, "Status") ];

		if (doLastTransitionTime) {
			statusCells.push(getStatusCellSpec("lastTransitionTime", durationValue, "Duration"));
		}
		if (doLastCheckTime) {
			statusCells.push(getStatusCellSpec("lastCheckTime", directValue, "Last Check"));
		}
		if (doMessage) {
			statusCells.push(getStatusCellSpec("message", directValue, "Message"));
		}
		if (doIsAcknowledged) {
			statusCells.push(getStatusCellSpec("isAcknowledged", directValue, "Ack"));
		}
		if (doAcknowledgedComment) {
			statusCells.push(getStatusCellSpec("acknowledgedComment", directValue, "Ack Message"));
		}

		$('#statusTable tbody').on('click', onStatusClick);
		$('#elementStatus').on('click', onStatusClick);

		// display the table (first time)
		updateChart();

		var statusSort = (function() {
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
				sort = naturalSort(arg1.name, arg2.name);
				if (sort != 0) {
					return sort;
				}
				return 0;
			};
		}());

		function getStatusCellSpec(field, valueGetter, header) {
			return {
				field : field,
				valueGetter : valueGetter,
				header : header
			};
		}

		function directValue(monitorStatus, field, elementStatus, now) {
			var val = monitorStatus[field];
			return ((val || typeof val === 'boolean') ? val : " ");
		}

		function nameLink(monitorStatus, field, elementStatus, now) {
			var linkPrefix = "<a href='" + uptimeGadget.getMonitorUrl(monitorStatus.id) + "' target='_top'>";
			return linkPrefix + monitorStatus[field] + "</a>";
		}

		function durationValue(monitorStatus, field, elementStatus, now) {
			return getDuration(now, monitorStatus[field]);
		}

		function renderStatusTableHeaderRow() {
			var headerRow = '<tr>';
			$.each(statusCells, function() {
				headerRow += '<th>' + this.header + '</th>';
			});
			headerRow += '</tr>';

			return headerRow;
		}

		function renderStatusTableRows(monitorStatuses, elementStatus, now) {
			var rows = [];

			monitorStatuses.sort(statusSort);
			$.each(monitorStatuses, function(i, monitorStatus) {
				if (monitorStatus.isHidden) {
					return;
				}
				var row = '<tr class="status-row color-text-' + monitorStatus.status.toUpperCase() + '">';
				$.each(statusCells, function(i, statusCell) {
					row += '<td>' + statusCell.valueGetter(monitorStatus, statusCell.field, elementStatus, now) + '</td>';
				});
				row += '</tr>';
				rows.push(row);
			});

			return rows.join('');
		}

		function onStatusClick(e) {
			window.top.location.href = $(e.target).closest('tr').find('a:first').attr('href');
		}

		function parseLocaltimeFromISO8601(dateString) {
			var parts = dateString.match(/\d+/g);
			return new Date(parts[0], parts[1] - 1, parts[2], parts[3], parts[4], parts[5]);
		}

		function getDuration(now, sinceDateString) {
			var since = parseLocaltimeFromISO8601(sinceDateString);
			var diff = now - since;
			var msec = diff;
			var hh = Math.floor(msec / 1000 / 60 / 60);
			msec -= hh * 1000 * 60 * 60;
			var mm = Math.floor(msec / 1000 / 60);
			return hh + "h " + mm + "m";
		}

		function renderTables(elementStatus, textStatus, jqXHR) {
			clearStatusBar();

			// first let's empty out the existing table(s)
			var statusTableHeader = $('#statusTable thead').empty();
			var statusTableBody = $('#statusTable tbody').empty();

			// convert strings to dates
			var nowDate = new Date();
			var stateLength = getDuration(nowDate, elementStatus.lastTransitionTime);
			$('#elementStatus').removeClass('color-text-CRIT color-text-WARN color-text-MAINT color-text-UNKNOWN color-text-OK')
					.addClass('color-text-' + elementStatus.status.toUpperCase());
			$('#elementStatusText').html(
					"<a href='" + uptimeGadget.getElementUrls(elementStatus.id, elementStatus.name).graphing + "' target='_top'>"
							+ elementStatus.name + "<br/><small><small>" + elementStatus.status + " for " + stateLength
							+ "</small></small>" + "</a>");

			// display topological dependencies, if there
			// are any
			var deps = elementStatus.topologyParentStatus;
			deps.sort(statusSort);
			var divboxes = "";
			if (deps.length > 0) {
				for ( var i = 0; i < deps.length; i++) {
					var link = "<a href='" + uptimeGadget.getElementUrls(deps[i].id, deps[i].name).graphing + "' target='_top'>";
					divboxes += link + '<div class="topoBox color-text-' + deps[i].status.toUpperCase() + '">' + deps[i].name
							+ "</div></a>";
				}
			}
			$('#topoParentsStatus').html("<p>Topological Parents:</p>" + divboxes);

			statusTableHeader.append(renderStatusTableHeaderRow());
			statusTableBody.append(renderStatusTableRows(elementStatus.monitorStatus, elementStatus, nowDate));
		}

		function renderOsIcon(element, textStatus, jqXHR) {
			$('img.os-icon-img').attr('src', uptimeGadget.getLargeSystemOsIconUrl(element.typeSubtype));
			$('img.os-icon-img').attr('title', element.typeOs);
		}

		function updateChart() {
			if (!elementId || elementId < 0) {
				displayStatusBar(new UPTIME.pub.errors.DisplayableError("No elements were found in up.time."),
						"No Elements Found");
				return;
			}
			$.ajax("/api/v1/elements/" + elementId, {
				cache : false
			}).done(renderOsIcon).fail(
					function(jqXHR, textStatus, errorThrown) {
						displayStatusBar(UPTIME.pub.errors.toDisplayableJQueryAjaxError(jqXHR, textStatus, errorThrown, this),
								"Error Getting Element from up.time Controller");
					});
			$.ajax("/api/v1/elements/" + elementId + "/status", {
				cache : false
			}).done(renderTables).fail(
					function(jqXHR, textStatus, errorThrown) {
						displayStatusBar(UPTIME.pub.errors.toDisplayableJQueryAjaxError(jqXHR, textStatus, errorThrown, this),
								"Error Getting Element Status from up.time Controller");
					});

			// Now let's set refresh rate for updating the table
			if (refreshRate > 0) {
				chartTimer = window.setTimeout(updateChart, refreshRate * 1000);
			}
		}

		function stopChartTimer() {
			if (chartTimer) {
				window.clearTimeout(chartTimer);
			}
		}

		// public functions for this function/class
		var publicFns = {
			stopTimer : stopChartTimer,
			startTimer : function() {
				if (chartTimer) {
					updateChart();
				}
			},
			destroy : function() {
				$('#statusTable tbody').off('click');
				$('#elementStatus').off('click');
				stopChartTimer();
			}
		};
		return publicFns; // Important: we need to return the public
		// functions/methods

	};
}