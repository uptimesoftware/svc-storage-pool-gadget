if (typeof UPTIME == "undefined") {
	var UPTIME = {};
}

if (typeof UPTIME.ElementStatusSimpleTableChart == "undefined") {

	UPTIME.ElementStatusSimpleTableChart = function(options, displayStatusBar, clearStatusBar) {
		var elementId = null;
		var refreshRate = null;

		var tableTimer = null;

		var relativeGetMetricsPath = '/gadgets/networkgauge/getNetworkDeviceMetrics.php';
		uptimeHost="localhost";
		
		if (typeof options == "object") {
			elementId = options.elementId;
			refreshRate = options.refreshRate;
			//doLastCheckTime = options.lastCheckTime;
		}

		var statusCells = [ getStatusCellSpec("name", nameLink, "Monitor"), getStatusCellSpec("status", directValue, "Status") ];
		
		// used to be in original
		/*
		if (doLastCheckTime) {
			statusCells.push(getStatusCellSpec("lastCheckTime", directValue, "Last Check"));
		}
		*/
		
		oTable = initializeAlertTable("#elementInfoTable");
		
		//requestString = relativeGetMetricsPath  + '?uptime_host=' + uptimeHost + '&query_type=san_storage_pool' + '&device_id=' + settings.deviceId + '&port_id=' + settings.portId;
		requestString = relativeGetMetricsPath  + '?uptime_host=' + uptimeHost + '&query_type=san_storage_pool';
		
		$.getJSON(requestString, function(data) {
			}).done(function(data) {
            //$("select.ports").empty();
            $.each(data, function(key,value) {
				oTable.fnAddData( [value[0],value[1],value[2],value[3],value[4]] );
				console.log("value");
				console.log(value[0]);
                //$("select.ports").append('<option value="' + val + '">' + key + '</option>');
            });
			/*
            if (typeof portId !== 'undefined') {
                if (debugMode) {console.log('Gadget #' + gadgetInstanceId + ' - Setting network port dropdown to: '
                    + portId)};
                $("select.ports").val(portId).trigger("chosen:updated").trigger('change');
            } else {
                $("select.ports").trigger("chosen:updated").trigger('change');
            }
            $("#port-count").text($('#ports option').length);
			*/
        }).fail(function(jqXHR, textStatus, errorThrown) {
            console.log('Gadget #' + gadgetInstanceId + ' - Request failed! ' + textStatus);
        }).always(function() {
            // console.log('Request completed.');
        });
		
		
		//oTable.fnAddData( [1,2,3,4,5,6] );
			
		
		
		/*

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
		*/

		function initializeAlertTable(tableString) {
		console.log("in init");
			// Initialize table if it's not initialized
			var table = $.fn.dataTable.fnTables(true);
			console.log("init");
			console.log(table);
			console.log("after");
			if ( !table.length > 0 ) {
				var oTable = $(tableString).dataTable({
					"aoColumnDefs": [ //{"sTitle": "ID", "bVisible": false, "bSearchable": false, "aTargets":[0]}, 
										{"sTitle": "Name", "aTargets":[0], "sWidth": "130px"},
										{"sTitle": "Status", "aTargets":[1]},
										//{"sTitle": "Capacity", "aTargets":[2], "sType": "enum", "sWidth": "60px"},
										{"sTitle": "Capacity", "aTargets":[2]},
										{"sTitle": "Used", "aTargets":[3]},
										{"sTitle": "Total", "aTargets":[4]}
									],
					"aaSorting": [[ 1, "desc" ]],
					"fnRowCallback": function( nRow, aData, iDisplayIndex, iDisplayIndexFull ) {
						$(nRow).attr('id', aData[0]);
						return nRow;
					},
					"iDisplayLength": 25,
					"fnInitComplete": function(oSettings, json) {
						$(".dataTables_filter").append("<a class='resetFilter' href=#><img class='resetFilterIcon' src=images/close_icon.gif></a>");
					}
				});
				$(".resetFilter").click(function(e){
					oTable.fnFilter("");
				});
			} else {
				oTable = $(tableString).dataTable();
			}
			
			return oTable;
		}
		
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
				tableTimer = window.setTimeout(updateChart, refreshRate * 1000);
			}
		}

		function stoptableTimer() {
			if (tableTimer) {
				window.clearTimeout(tableTimer);
			}
		}

		// public functions for this function/class
		var publicFns = {
			stopTimer : stoptableTimer,
			startTimer : function() {
				if (tableTimer) {
					updateChart();
				}
			},
			destroy : function() {
				$('#statusTable tbody').off('click');
				$('#elementStatus').off('click');
				stoptableTimer();
			}
		};
		return publicFns; // Important: we need to return the public
		// functions/methods

	};
}