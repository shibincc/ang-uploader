
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
			init : init
		};
				var uploaderHolder;
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
		var uploadForm	= '<form id="fileupload" action="//jquery-file-upload.appspot.com/" method="POST" enctype="multipart/form-data">'+
					        '<!-- Redirect browsers with JavaScript disabled to the origin page -->'+
					        '<!-- The fileupload-buttonbar contains buttons to add/delete files and start/cancel the upload -->'+
					        '<div class="row fileupload-buttonbar">'+
					            '<div class="col-lg-7">'+
					                '<!-- The fileinput-button span is used to style the file input field as button -->'+
					                '<span class="btn btn-success fileinput-button">'+
					                    '<i class="glyphicon glyphicon-plus"></i>'+
					                    '<span>Add files...</span>'+
					                    '<input type="file" name="files[]" multiple>'+
					                '</span>'+
					                '<button type="submit" class="btn btn-primary start">'+
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
					                '<input type="checkbox" class="toggle">'+
					                '<!-- The global file processing state -->'+
					                '<span class="fileupload-process"></span>'+
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
					    '</form>'
		return exposedAPIs;
		/////////////////////////////

		function init(config){
			var self = this;
			_initTemplates();
			self.config = config ? angular.extend({},config) : {};
			self.formEl = self.config.formEl || $('#fileupload');
			$(self.formEl).fileupload({
		        // Uncomment the following to send cross-domain cookies:
		        //xhrFields: {withCredentials: true},
		        url: gateway,
	 			/*dropZone:dropEl,*/
	 			 beforeSend: function(xhr, data) {
	                debugger;
	                var file = data.files[0];
	                xhr.setRequestHeader('RequestType', "FileOperation");
	                xhr.setRequestHeader('scope', config.scope);
	                xhr.setRequestHeader('target', config.target);
	                xhr.setRequestHeader('responsetype', "json");
	            }
		        
		    });
		}

		function _initTemplates(){
			var $_body = $("body");
			if($_body && !$_body.isPreviewTplAdded){
				$("body").append(uploadPreviewTpl);
				$("body").append(downloadPreviewTpl);				
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
                /*form : this.formEl,
                callback : this.onUpload.bind(this),
                progressHandler : this.progressHandler,
                gateway : $$DocexConfig.get("fsGateway"),
                headers : {
                    responsetype : "json"
                }*/
       

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
			element.click(function(){
				scope.uploadConfig;
				$$vsUploader.init(scope.uploadConfig);
			});

		}
	}
	AddFileController.$inject = ['$scope'];

	function AddFileController($scope){
		//$$vsUploader.init();
		$scope.uploadConfig = angular.extend({},$scope.config);

	}
})(); 
