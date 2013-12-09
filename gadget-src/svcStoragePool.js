$(function() {
	
	var relativeGetMetricsPath = '/gadgets/IBM_SAN_SVC/getData.php';
	var getMetricsPath = relativeGetMetricsPath;

	var elementMonitorListSettings = {
		'elementId' : -1,
		'refreshRate' : 30

	};
	var myTable = null;
	var divsToDim = [ '#widgetChart', '#widgetSettings' ];

	$("#widgetSettings").hide();

	$('.widget-option').change($.debounce(500, settingChanged));

	$("#closeSettings").click(function() {
		settingChanged(); //plui
		$("#widgetSettings").slideUp();
	});

	uptimeGadget.registerOnEditHandler(showEditPanel);
	uptimeGadget.registerOnLoadHandler(function() {
		uptimeGadget.loadSettings().then(onGoodLoad, onBadAjax);
	});
	uptimeGadget.registerOnResizeHandler(resizeGadget);

	function settingChanged() {
		elementMonitorListSettings.elementId = $('#elementId').val();
		elementMonitorListSettings.refreshRate = $('#refreshRate').val();
		console.log($('#elementId').val());
		console.log("in settingChanged3");
		console.log(elementMonitorListSettings.elementId);
		
		uptimeGadget.saveSettings(elementMonitorListSettings).then(onGoodSave, onBadAjax);
	}

	function resizeGadget() {
		$("body").height($(window).height());
	}

	function showEditPanel() {
		// stop any existing timers in the charts (for when we save and change
		// settings)
		if (myTable) {
			myTable.stopTimer();
		}
		$("#refreshRate").val(elementMonitorListSettings.refreshRate);
		$("#widgetSettings").slideDown();
		resizeGadget();
		return populateIdSelector().then(function() {
			settingChanged();
		});
	}

	function disableSettings() {
		$('.widget-option').prop('disabled', true);
		$('#closeButton').prop('disabled', true).addClass("ui-state-disabled");
	}

	function enableSettings() {
		$('.widget-option').prop('disabled', false);
		$('#closeButton').prop('disabled', false).removeClass("ui-state-disabled");
	}

	function displayPanel(settings) {
		// Display the chart
		$('#widgetChart').show();
		displayTable(settings);
		resizeGadget();
	}

	function elementSort(arg1, arg2) {
		return naturalSort(arg1.name, arg2.name);
	}

	function populateIdSelector() {
		disableSettings();
		var deferred = UPTIME.pub.gadgets.promises.defer();
		//$('#elementId').empty().append($("<option />").val(-1).text("Loading..."));
				
		var elementSelector = $('#elementId').empty();
		elementSelector.append($("<option />").val(-1).text("Loading..."));
		//elementSelector.empty().append($("<option />").val(-1).text("Loading..."));
		
		//elementSelector.append($("<option />").val(this.id).text(this.name));
		//elementSelector.append($("<option />").val("1").text("element1"));
		
		
		requestString = getMetricsPath + '?erdc_id=' + '1' + '&query_type=find_erdc';
		$.getJSON(requestString, function(data) {
		}).done(function(data) {
			clearStatusBar();
			enableSettings();
			//if (debugMode) {console.log('Gadget #' + gadgetInstanceId + ' - Request succeeded!')};
			elementSelector.empty();
			$.each(data, function(key, val) {
				elementSelector.append('<option value="' + val + '">' + key + '</option>');
				console.log('val=' + val +' key='+key);
			});
			/*
			if (typeof deviceId !== 'undefined') {
				if (debugMode) {console.log('Gadget #' + gadgetInstanceId + ' - Setting network device dropdown to: '
					+ deviceId)};
				elementSelector.val(deviceId).trigger("chosen:updated").trigger('change');
			} else {
				elementSelector.trigger("chosen:updated").trigger('change');
			}
			*/
			//$("#device-count").text($('#devices option').length);
			}).fail(function(jqXHR, textStatus, errorThrown) {
				enableSettings();
				//console.log('Gadget #' + gadgetInstanceId + ' - Request failed! ' + textStatus);
			}).always(function() {
				// console.log('Request completed.');
			});
			return deferred.promise.then(null, function(error) {
			displayStatusBar(error, "Error Loading the List of Elements from up.time Controller");
		});
		
		
		
		/*
		$.ajax("/api/v1/elements/", {
			cache : false
		}).done(function(data, textStatus, jqXHR) {
			clearStatusBar();
			enableSettings();
			// fill in element drop down list
			data.sort(elementSort);
			var elementSelector = $('#elementId').empty();
			$.each(data, function() {
				if (!this.isMonitored) {
					return;
				}
				elementSelector.append($("<option />").val(this.id).text(this.name));
			});
			if (elementMonitorListSettings.elementId >= 0) {
				elementSelector.val(elementMonitorListSettings.elementId);
			}
			deferred.resolve(true);
		}).fail(function(jqXHR, textStatus, errorThrown) {
			enableSettings();
			deferred.reject(UPTIME.pub.errors.toDisplayableJQueryAjaxError(jqXHR, textStatus, errorThrown, this));
		});
		return deferred.promise.then(null, function(error) {
			displayStatusBar(error, "Error Loading the List of Elements from up.time Controller");
		});
		*/
	}

	// Main Gadget Logic Start
	function onGoodLoad(settings) {
	
	console.log("in onGoodLoad");
	console.log(settings);
	console.log("in onGoodLoad2");
	
		if (settings) {
		
			// update (hidden) edit panel with settings
			$("#refreshRate").val(settings.refreshRate);
			$("#elementId").val(settings.elementId);
			$.extend(elementMonitorListSettings, settings);
		}
		if (settings) {
			displayPanel(settings);
		} else {
			$('#widgetChart').hide();
			showEditPanel();
		}
	}

	function displayStatusBar(error, msg) {
		gadgetDimOn();
		var statusBar = $("#statusBar").empty();
		uptimeErrorFormatter.getErrorBox(error, msg).appendTo(statusBar);
		statusBar.slideDown();
	}

	function clearStatusBar() {
		gadgetDimOff();
		$("#statusBar").slideUp().empty();
	}

	function gadgetDimOn() {
		$.each(divsToDim, function(i, d) {
			var div = $(d);
			if (div.is(':visible') && div.css('opacity') > 0.6) {
				div.fadeTo('slow', 0.3);
			}
		});
	}

	function gadgetDimOff() {
		$.each(divsToDim, function(i, d) {
			var div = $(d);
			if (div.is(':visible') && div.css('opacity') < 0.6) {
				div.fadeTo('slow', 1);
			}
		});
	}

	function onGoodSave(savedSettings) {
		clearStatusBar();
		displayPanel(savedSettings);
	}

	function onBadAjax(errorObject) {
		displayStatusBar(errorObject, "Error Communicating with up.time");
	}

	function displayTable(settings) {
		// clean up any resources before creating a new chart.
		if (myTable) {
			myTable.destroy();
		}
console.log("in displayTable");
		// display chart
		
		myTable = new UPTIME.ElementStatusSimpleTableChart(settings, displayStatusBar, clearStatusBar);
		
	}

});
