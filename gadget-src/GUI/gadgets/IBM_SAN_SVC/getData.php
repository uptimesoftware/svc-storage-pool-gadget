<?php

	header("Content-type: text/json");
	$query_type = $_GET['query_type'];
	$erdc_id= $_GET['erdc_id'];

	////////////////////   !!PLEASE CHANGE!!    ///////////////////
	// DSN in odbc.ini
	$host = "uptime_oracle_odbc";
	// Username
    $user = "css17";
	// Password
    $pass = "uptime";
	///////////////////////////////////////////////////////////////

    $con = odbc_connect($host, $user, $pass);


	if(!$con) {
			trigger_error('Could not connect to database: '. odbc_errormsg());		   
	}
	
	if ($query_type == "find_erdc") {

		$sql = "select e.name as entity_name, ei.name as einame, ei.erdc_instance_id as eiid from entity e join erdc_instance ei on e.entity_id = ei.entity_id join erdc_configuration ec on ec.id = ei.configuration_id join erdc_base eb on eb.erdc_base_id = ec.erdc_base_id where eb.name='IBM SAN SVC Health'";

		$query = odbc_exec($con,$sql);
		
		$result = "{";

		while($row = odbc_fetch_row($query)) {
			$result .="\"".odbc_result($query,"entity_name")." - ". odbc_result($query,"einame") . "\":".  odbc_result($query,"eiid") . ",";
		}
		
		$result = substr($result, 0, strlen($result)-1);

		$result .= "}";

		echo $result;
	}

	elseif ($query_type == "get_data") {
		$sql2 = "select ro.object_name as object_name, rov.name as name , rov.value as value, rov.ranged_object_id, rov.sample_time from ranged_object ro join ranged_object_value rov on ro.id = rov.ranged_object_id where ro.instance_id = " . $erdc_id . " and rov.name like 'SP%' and rov.name != 'SPRemaining' and rov.sample_time = (select max(rov.sample_time) from ranged_object ro join ranged_object_value rov on ro.id = rov.ranged_object_id where ro.instance_id = " . $erdc_id . " and rov.name like 'SP%')";

        $query2 = odbc_exec($con,$sql2);

		$new_result = array();
		$i = 0;
		$key_arr = array();

        while($row2 = odbc_fetch_row($query2)) {

			if(!in_array(odbc_result($query2,"object_name"), $new_result)) {
				$new_result[$i] = odbc_result($query2,"object_name");
				$i++;
				$key_arr[$i-1][0] =0;
				$key_arr[$i-1][1] =0;
				$key_arr[$i-1][2] =0;
				$key_arr[$i-1][3] =0;
			}
				$name=odbc_result($query2,"name");
				$queryresult=odbc_result($query2,"value");
				
				if ($name == "SPOperationalStatus") { $key_arr[$i-1][0] = $queryresult; }
				elseif ($name == "SPOverall") { $key_arr[$i-1][1] = $queryresult; }
				elseif ($name == "SPUsed") { $key_arr[$i-1][2] = $queryresult; }
				elseif ($name == "SPTotal") { $key_arr[$i-1][3] = $queryresult; }				
        }

		$final_array = array_combine($new_result, $key_arr);

		$result2 = "[";	
		
		foreach($final_array as $key=> $value) {
			$res_arr = $value;
			$result2 .= '["'.$key.'",';
			foreach($res_arr as $res)
				$result2 .= $res.',';
		
			$result2 = substr($result2, 0, strlen($result2)-1);

			$result2 .= '],';
		}

		$result2 = substr($result2, 0, strlen($result2)-1);

		$result2 .= "]";

		echo $result2;
		
	}

		
?>
