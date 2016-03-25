
(function () {
	"use strict";
	angular
		.module("sbc_uploader",[])
})();

(function () {
	"use strict";
	angular
		.module("sbc_uploader")
		.service("vsUploader",vsUploader);
	vsUploader.$inject = [];
	
	function vsUploader(){
		var exposedAPIs = {
			init : init,
			browseFile:browseFile
		};
		var gateway = "/filegateway";

		var uploadPreviewTpl =  '<script id="template-upload" type="text/x-tmpl">'+'{% for (var i=0, file; file=o.files[i]; i++) { %}'+
								    '<tr class="template-upload fade">'+
								        '<td>'+
								            '<span class="preview"></span>'+
								        '</td>'+
								        '<td>'+
								            '<p class="name">{%=file.name%}</p>'+
								            '<strong class="error text-danger"></strong>'+
								        '</td>'+
								        '<td>'+
								            '<p class="size">Processing...</p>'+
								            '<div class="progress progress-striped active" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"><div class="progress-bar progress-bar-success" style="width:0%;"></div></div>'+
								        '</td>'+
								        '<td>'+
								            '{% if (!i && !o.options.autoUpload) { %}'+
								                '<button class="btn btn-primary start" disabled>'+
								                    '<i class="glyphicon glyphicon-upload"></i>'+
								                    '<span>Start</span>'+
								                '</button>'+
								            '{% } %}'+
								            '{% if (!i) { %}'+
								                '<button class="btn btn-warning cancel">'+
								                    '<i class="glyphicon glyphicon-ban-circle"></i>'+
								                    '<span>Cancel</span>'+
								                '</button>'+
								            '{% } %}'+
								        '</td>'+
								    '</tr>'+
								'{% } %} </script>';

		var downloadPreviewTpl = '<script id="template-download" type="text/x-tmpl">'+'{% for (var i=0, file; file=o.files[i]; i++) { %}'+
									    '<tr class="template-download fade">'+
									        '<td>'+
									            '<span class="preview">'+
									                '{% if (file.thumbnailUrl) { %}'+
									                    '<a href="{%=file.url%}" title="{%=file.name%}" download="{%=file.name%}" data-gallery><img src="{%=file.thumbnailUrl%}"></a>'+
									                '{% } %}'+
									            '</span>'+
									        '</td>'+
									        '<td>'+
									            '<p class="name">'+
									                '{% if (file.url) { %}'+
									                    '<a href="{%=file.url%}" title="{%=file.name%}" download="{%=file.name%}" {%=file.thumbnailUrl?\'data-gallery\':\'\'%}>{%=file.name%}</a>'+
									                '{% } else { %}'+
									                    '<span>{%=file.name%}</span>'+
									                '{% } %}'+
									            '</p>'+
									            '{% if (file.error) { %}'+
									                '<div><span class="label label-danger">Error</span> {%=file.error%}</div>'+
									            '{% } %}'+
									        '</td>'+
									        '<td>'+
									            '<span class="size">{%=o.formatFileSize(file.size)%}</span>'+
									        '</td>'+
									        '<td>'+
									            '{% if (file.deleteUrl) { %}'+
									                '<button class="btn btn-danger delete" data-type="{%=file.deleteType%}" data-url="{%=file.deleteUrl%}"{% if (file.deleteWithCredentials) { %} data-xhr-fields=\'{"withCredentials":true}\'{% } %}>'+
									                    '<i class="glyphicon glyphicon-trash"></i>'+
									                    '<span>Delete</span>'+
									                '</button>'+
									                '<input type="checkbox" name="delete" value="1" class="toggle">'+
									            '{% } else { %}'+
									                '<button class="btn btn-warning cancel">'+
									                    '<i class="glyphicon glyphicon-ban-circle"></i>'+
									                    '<span>Cancel</span>'+
									                '</button>'+
									            '{% } %}'+
									        '</td>'+
									    '</tr>'+
									'{% } %} </script>';
		var defaultConfig = {
			type : "anonymous",					// anonymous or authenticated; the scope of the service
			serviceType : null,		// the target of the service
			MAX_FILE_SIZE : "30000000",
			fileNameLabel : null,			// the element where the filename should be displayed
			fileName : null,				// the name of the file being uploaded; either provided by the user or extracted from the picked file
			folderName : null,				// the folder to where it should be uploaded; if not provided by the user, the userId is used as value
			displayName : null,			// the name to be displayed in the 'fileNameLabel'
			accept : null,					// the value for accept file types
			meta : {},			// any specific config and upload params,
			onUploadSuccess : null,
			onUploadFail :null,
			TYPE_ANONYMOUS : "anonymous",
			TYPE_AUTH : "authenticated"
		};
				
		return exposedAPIs;
		/////////////////////////////

		function init(config){
			var _self = this;
			_initTemplates();
			_self.config = config ? angular.extend({},defaultConfig,config) : {};
			_self.uploadForm = _getUploadForm(config)
			_self.formEl = _self.config.formEl || $(_self.uploadForm);
			if(_self.config.container){
				_self.config.container.append(_self.uploadForm);
				_self.config.container.formEl = _self.config.container.find("#fileupload");
				_self.formEl = $(_self.config.container.formEl);		
				_self.dropZone = $(_self.config.container);		
			}else{
				$("body").append(_self.formEl);
			}

			if(_self.config.thisEl){
		    	//attaching form to pagelevel upload button
		    	_self.config.thisEl.formEl = _self.formEl;
		    }		

			//initialize fileupload library
			_self.fileUploadConfig = _getFileUploadConfig(angular.extend({},_self));
			$(_self.formEl).fileupload(_self.fileUploadConfig)
				.bind('fileuploaddone', function (e, data) {
					_self.config.onUploadSuccess && _self.config.onUploadSuccess(e, data);
				})
				.bind('fileuploadfail', function (e, data) {
					if(typeof _self.config.onUploadFail === "function"){
						_self.config.onUploadFail.call(e, data)
					}else{
						console.log('Upload failed');
					}
				});
		}

		function browseFile(el){
			//click callback of pagelevel upload button
		    el.formEl.find("[data-id='add-file']").click();
		}

		function _getUploadForm(config){
			//create upload form based on configuration
			var uploadForm	= '<form id="fileupload" action="//jquery-file-upload.appspot.com/" method="POST" enctype="multipart/form-data" style="">'+
					        
					        	'<div class="row fileupload-buttonbar">'+
					            	'<div class="col-lg-7">';
			if(!config.hidefileBrowse){
				uploadForm += '<span class="btn btn-success fileinput-button">'+
				                    '<i class="glyphicon glyphicon-plus"></i>'+
				                    '<span>Add files...</span>'+
				                    '<input type="file" name="files[]" multiple  data-id="add-file">'+
				                '</span>';				            
			}else{
				//hide form file browse button
				uploadForm += '<span class="btn btn-success fileinput-button" style="display:none">'+
				                    '<i class="glyphicon glyphicon-plus"></i>'+
				                    '<span>Add files...</span>'+
				                    '<input type="file" name="files[]" multiple  data-id="add-file">'+
				                '</span>';			
			}

			if(!(config.options && config.options.autoUpload)){
				//hide submit and delete button in case of autoupload
				uploadForm += '<button type="submit" class="btn btn-primary start">'+
			                    '<i class="glyphicon glyphicon-upload"></i>'+
			                    '<span>Start upload</span>'+
			                '</button>'+
			                '<button type="reset" class="btn btn-warning cancel">'+
			                    '<i class="glyphicon glyphicon-ban-circle"></i>'+
			                    '<span>Cancel upload</span>'+
			                '</button>'+
			                '<button type="button" class="btn btn-danger delete">'+
			                    '<i class="glyphicon glyphicon-trash"></i>'+
			                    '<span>Delete</span>'+
			                '</button>'+
			                '<input type="checkbox" class="toggle">'
			}
			uploadForm +=  '<span class="fileupload-process"></span>'+
					            '</div>'+
					            '<!-- The global progress state -->'+
					            '<div class="col-lg-5 fileupload-progress fade">'+
					                '<!-- The global progress bar -->'+
					                '<div class="progress progress-striped active" role="progressbar" aria-valuemin="0" aria-valuemax="100">'+
					                    '<div class="progress-bar progress-bar-success" style="width:0%;"></div>'+
					                '</div>'+
					                '<!-- The extended global progress state -->'+
					                '<div class="progress-extended">&nbsp;</div>'+
					            '</div>'+
					        '</div>'+
					        '<!-- The table listing the files available for upload/download -->'+
					        '<table role="presentation" class="table table-striped"><tbody class="files"></tbody></table>'+
					    '</form>';
			return uploadForm;
		}

		function _initTemplates(){
			//inject preview template format to document for creating preview by fileupload library
			var $_body = $("body");
			if($_body && !$_body.isPreviewTplAdded){
				$_body.append(uploadPreviewTpl);
				$_body.append(downloadPreviewTpl);				
			}
		}

		function _getFileUploadConfig(params){
			params = params || {};
			var fileUploadConfig ={
				//fileupload config
				url : gateway,
	 			dropZone:params.dropZone || $(params.formEl),
	 			loadImageMaxFileSize : params.config.MAX_FILE_SIZE,
	 			beforeSend: function(xhr, data){
	 				_beforeUploadCallback(xhr, data,params.config);
	 			}

	 		};

	 		if(typeof params.config.options !== "undefined"){
				fileUploadConfig = angular.extend(fileUploadConfig, params.config.options);
			}

			return fileUploadConfig;
		}

		function _beforeUploadCallback(xhr, data,config) {
            var file = data.files[0];
            var customHeaders;
            if(config.type === defaultConfig.TYPE_AUTH){
            	customHeaders = {
					scope : "Attachment",
					target : config.serviceType || "Upload",
					responsetype : "json",
					headers : {}
				}
            }else if (config.type === defaultConfig.TYPE_ANONYMOUS) {
            	customHeaders = _anonymousUploadConfig(config);
            }
            xhr.setRequestHeader('RequestType', "FileOperation");
            xhr.setRequestHeader('scope', config.scope);
            xhr.setRequestHeader('target', config.target);
            xhr.setRequestHeader('responsetype', customHeaders.responsetype);

            if(customHeaders.headers){
				for(var header in customHeaders.headers){
					xhr.setRequestHeader(header, customHeaders.headers[header]);
				}
			}
        }

        function _anonymousUploadConfig(config) {
			var target = "Normal",
				formParams = {},
				headers = {};

			//this.formEl.querySelector('[name="flnm"]').value = this.fileName;

			// If a thumbnail image needs to be created
			if(config.createVariants) {
				target = "ImageWithProcessing";
				formParams.resize = "true";
			}

			if(config.compress){
				target = "ImageWithProcessing";
				formParams.resize = "true";
			}
			if(config.extractZip){
				target = "Compressed";
			}
			if(config.listFilesInZip){
			}

			if(config.resizeSize){
				formParams["resize-to"] = config.resizeSize;
				formParams["keep-aspect-ratio"] = "true";
			}

			// context
			if(config.context){
				switch(config.context.type){
					case "group" :
						headers["Context"] = "Group";
						headers["replace-group"] = config.context.id;
					break;
					case "user" :
						headers["Context"] = "User";
						headers["replace-profile"] = config.context.id;
					break;
					case "account" :
						headers["Context"] = "Account";
						headers["replace-account"] = config.context.id;
					break;
					case "apps" :
						headers["Context"] = "Apps";
						if(config.context.id){
							headers["replace-app"] = config.context.id;
						}
					break;
					case "account-thumb" :
						headers["Context"] = "AccountTile";
						headers["replace-account"] = config.context.id;
					break;
				}
			}

			return {
				scope : "AnonymousFiles",
				target : target,
				formParams : formParams,
				headers : headers,
				responsetype : "json"
			}
		}
	}
})(); 

(function () {
 	"use strict";
 	angular
 		.module("sbc_uploader")
 		.controller("UploaderController",UploaderController);
 	UploaderController.$inject = ['$scope'];
 	
 	function UploaderController($scope){
        
        var dropEl = $("#dropzone");
        $scope.config = {          
            formEl  :  $('#fileupload'),
        };
              
        $scope.fdList = [
        	{
        		id : 1,
        		name:"aaa"
        	},{
        		id : 2,
        		name:"bbb"
        	},{
        		id : 3,
        		name:"ccc"
        	},
        ]
       $(document).bind('drop dragover', function (e) {
           // dropEl.text("Drop Files Here")
            e.preventDefault();
        });

        /*$('#fileUpload').bind('fileuploadsubmit', function (e, data) {
            e; data; debugger
        })*/                
    };
})(); 

(function () {
	/* Comments*/
	"use strict";
	angular
		.module("sbc_uploader")
		.directive("addFile",addFile);
	addFile.$inject = ['vsUploader'];
	function addFile($$vsUploader){
		var directive = {
			templateUrl : "",
			restrict : "A",
			replace:false,
			scope : {
				config : "=uploadConfig"
			},
			link : linkFunction,
			controller : AddFileController,
			//controllerAs : vm,
			//bindToController : true
		}

		return directive;

		//////////////////////

		function linkFunction(scope, element, attrs){
			element;
			scope.uploadConfig.thisEl = element;
			scope.uploadConfig.hidefileBrowse = true;
			scope.uploadConfig.options = {
				autoUpload : true,

			};
			$$vsUploader.init(scope.uploadConfig);
			element.click(function(){
				$$vsUploader.browseFile(element);
			});

		}
	}
	AddFileController.$inject = ['$scope'];

	function AddFileController($scope){
		//$$vsUploader.init();
		$scope.uploadConfig = angular.extend({},$scope.config);

	}
})(); 

(function () {
	/* Comments*/
	"use strict";
	angular
		.module("sbc_uploader")
		.directive("vsFd",vsFd);
	vsFd.$inject = ['vsUploader'];
	function vsFd($$vsUploader){
		var directive = {
			templateUrl : "fd.tpl.htm",
			restrict : "E",
			replace:true,
			scope : {
				fd : "=fdData"
			},
			link : linkFunction,
			controller : VsFdController,
			//controllerAs : vm,
			//bindToController : true
		}

		return directive;

		//////////////////////

		function linkFunction(scope, element, attrs){
			scope.uploadConfig = {
				container : element,
				type:"authenticated"
			}
			$$vsUploader.init(scope.uploadConfig);
			/*element;
			element.click(function(){
				scope.uploadConfig;
			});*/

		}
	}
	VsFdController.$inject = ['$scope','vsUploader'];

	function VsFdController($scope,$$vsUploader){
		//$$vsUploader.init();
		debugger;
		$scope.fd;
		$scope.uploadConfig = {
			container:angular.element("#fd-"+$scope.fd.id)
		};
		//$vsUploader.init($scope.uploadConfig);

	}
})(); 
