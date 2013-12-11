if (typeof UPTIME == "undefined") {
	var UPTIME = {};
}

if (typeof UPTIME.ElementStatusSimpleTableChart == "undefined") {

	UPTIME.ElementStatusSimpleTableChart = function(options, displayStatusBar, clearStatusBar) {
		var elementId = null;
		var refreshRate = null;

		var tableTimer = null;

		var relativeGetMetricsPath = '/gadgets/IBM_SAN_SVC/getData.php';
		uptimeHost="localhost";
		
		if (typeof options == "object") {
			elementId = options.elementId;
			refreshRate = options.refreshRate;
			//doLastCheckTime = options.lastCheckTime;
		}

		var statusCells = [ getStatusCellSpec("name", nameLink, "Monitor"), getStatusCellSpec("status", directValue, "Status") ];
		
		
		oTable = initializeAlertTable("#elementInfoTable");
		
		updateTable();
		

		function initializeAlertTable(tableString) {
		console.log("in init");
			// Initialize table if it's not initialized
			var table = $.fn.dataTable.fnTables(true);

			if ( !table.length > 0 ) {
				var oTable = $(tableString).dataTable({
					"aoColumnDefs": [ //{"sTitle": "ID", "bVisible": false, "bSearchable": false, "aTargets":[0]}, 
										{"sTitle": "Name", "aTargets":[0], "sWidth": "130px"},
										{"sTitle": "Status", "aTargets":[1]},
										//{"sTitle": "Capacity", "aTargets":[2], "sType": "enum", "sWidth": "60px"},
										{"sTitle": "Used Capacity (%)", "aTargets":[2]},
										{"sTitle": "Used (TB)", "aTargets":[3]},
										{"sTitle": "Total (TB)", "aTargets":[4]}
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

		function updateTable() {
			oTable.fnClearTable();
			
		requestString = relativeGetMetricsPath  + '?erdc_id=' + elementId + '&query_type=get_data';
		
			$.getJSON(requestString, function(data) {
				}).done(function(data) {
				$.each(data, function(key,storagePool) {

					var op_status=["", "Other","OK","Degraded","Stressed","Predictive Failure","Error","Non-Recoverable Error","Starting","Stopping","Stopped","In Service","No Contact","Lost Communication","Aborted","Dormant","Supporting Entity in Error","Completed","Power Mode"];		
				
					oTable.fnAddData( [storagePool[0],op_status[storagePool[1]],storagePool[2],storagePool[3],storagePool[4]] );

				});
			}).fail(function(jqXHR, textStatus, errorThrown) {
				console.log(' - Request failed! ' + textStatus);
			}).always(function() {
				// console.log('Request completed.');
			});
			
			var currentTime = new Date();
			stringTime = getDateString(currentTime);
			$("#lastUpdate").html("Last Refresh:  "+currentTime.getFullYear()+"-"+stringTime[0]+"-"+stringTime[1]+" "+stringTime[2]+":"+stringTime[3]+":"+stringTime[4]);
		
		
			// Now let's set refresh rate for updating the table
			if (refreshRate > 0) {
				tableTimer = window.setTimeout(updateTable, refreshRate * 1000);
			}
		}

		function stoptableTimer() {
			if (tableTimer) {
				window.clearTimeout(tableTimer);
			}
		}
		
		function getDateString(inputDate) {
			var returnString = new Array();
			
			if (parseInt(inputDate.getMonth()+1) < 10) {
				stringMonth = "0"+parseInt(inputDate.getMonth()+1);
			} else stringMonth = inputDate.getMonth()+1;
			if (inputDate.getDate() < 10) {
				stringDate = "0"+inputDate.getDate();
			} else stringDate = inputDate.getDate();
			if (inputDate.getHours() < 10) {
				stringHour = "0"+inputDate.getHours();
			} else stringHour = inputDate.getHours();
			if (inputDate.getMinutes() < 10) {
				stringMinute = "0"+inputDate.getMinutes();
			} else stringMinute = inputDate.getMinutes();
			if (inputDate.getSeconds() < 10) {
				stringSecond = "0"+inputDate.getSeconds();
			} else stringSecond = inputDate.getSeconds();
			
			return [stringMonth, stringDate, stringHour, stringMinute, stringSecond]
		
		}

		// public functions for this function/class
		var publicFns = {
			stopTimer : stoptableTimer,
			startTimer : function() {
				if (tableTimer) {
					updateTable();
				}
			},
			destroy : function() {
				//$('#statusTable tbody').off('click');
				//$('#elementStatus').off('click');
				stoptableTimer();
			}
		};
		return publicFns; // Important: we need to return the public
		// functions/methods

	};
}
