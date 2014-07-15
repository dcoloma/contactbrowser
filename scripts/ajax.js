
/**
 * Allows the execution of XMLHttpRequest in a cross-browser manner
 * The following input parameters are used:
 *  - successCallback: method that will be invoked if the request
 *       is executed successfully
 *  - errorCallback: method that will be invoked if the request
 *       is executed unsuccessfully
 *  - parameters: object that should include two attributes related
 *       with the request to be executed: uri and requestType that 
 *       include respectively the URI to be invoked and the type
 *       of HTTP request (e.g. "POST", "GET"...)
 *  - responseType: Type of response expected in the invocation
 *       of the HTTP request (e.g. "XML", "JSON").
 *
 *  If the method completes successfully the successCallback
 *  will be invoked passing to it an input argument with the
 *  data retrieved
 */
function ajaxRequest(successCallback, errorCallback, parameters, responseType) {
	
	if(parameters.uri === null) {
		errorCallback("No URI was passed in the parameters");
		return;
	}
	
	var httpRequest = getHTTPRequest();
	
	if(httpRequest !== null) {
		httpRequest.onreadystatechange = function() {
			if(httpRequest.readyState == 4) {
				if(httpRequest.status == 200) {	
					if (responseType == "XML") {
						responseContent = httpRequest.responseXML;
					}else if(responseType =="JSON"){
						responseContent =  eval('(' + httpRequest.responseText + ')');
					}else{
						responseContent = httpRequest.responseText;
					}
					successCallback(responseContent);
				}else {
					errorCallback("Request received an status different to 200 " + httpRequest.status);
                    return;
				}
			}
		};
		httpRequest.open(parameters.requestType, parameters.uri, false);
		httpRequest.send(null);
	}
	else {
		errorCallback("Fail creating AJAX request")
	}
}

function getHTTPRequest(){
	var xhr = null;
    try {
		xhr = new ActiveXObject('Msxml2.XMLHTTP');
	}
	catch(e1) {
		try {
	    		xhr = new ActiveXObject('Microsoft.XMLHTTP');
		}
		catch(e2) {
			try {
				xhr = new XMLHttpRequest();
			}
			catch(e3) {
				xhr = null;
			}
		}
	}
	return xhr;
}



