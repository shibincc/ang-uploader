(function () {
	"use strict";
	angular
		.module("docex")
		.service("vsUploader",vsUploader);
	vsUploader.$inject = ['Docex.Config','Docex.Util','$compile','$rootScope','$timeout'];
	
	function vsUploader($$docexConfig,$$util,$compile,$rootScope,$timeout){
		var exposedAPIs = {
			getUploader : getUploader,
		};
		var gateway = $$docexConfig.get("fsGateway");

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

		var previewTpl = '<div  class="row preview-wrap" data-id="upload-preview">'+
							'<div class="col-md-2 col-sm-3 col-xs-4">'+
								'<div class="image ">'+
									'<img src="{{file-src}}" vs-err-src = "{{default-preview}}">'+
								'</div>'+
							'</div>'+
							'<div class="col-md-9 col-sm-8 col-xs-7 ">'+
								'<p>'+
									'<b>{{file-name}}</b>'+
								'</p>'+
							'</div>'+
							'<div class="col-md-1 col-sm-1 col-xs-1 ">'+
								'<a class="delete-link zoom" data-name="delete">X</a>'+
							'</div>'+
						'</div>'
		var progressBar = '<div class="col-lg-12 col-md-12 fileupload-progress">'+
				                '<div class="progress progress-striped active" role="progressbar" aria-valuemin="0" aria-valuemax="100">'+
				                    '<div class="progress-bar progress-bar-success" data-name="progress-strip" style="width:0%;"></div>'+
				                '</div>'+
				                '<div class="progress-extended">&nbsp;</div>'+
				            '</div>';
		var constants = {
			TYPE_ANONYMOUS : "anonymous",
			TYPE_AUTH : "authenticated",
			REQUESTTYPE : "requesttype",
			SCOPE : "scope",
			TARGET : "target",
			RESPONSETYPE : "responsetype",
			FILEOPERATION : "FileOperation"
		};


		var uploader =  function(config){
			this.type =  config.type || null;					// anonymous or authenticated; the scope of the service
			this.serviceType = null,			// the target of the service
			this.MAX_FILE_SIZE = "30000000";
			this.enableMultiFileUpload = (typeof config.enableMultiFileUpload !== "undefined") ? config.enableMultiFileUpload : true;			// the element where the filename should be displayed
			this.fileNameLabel = null;			// the element where the filename should be displayed
			this.fileName = null;				// the name of the file being uploaded; either provided by the user or extracted from the picked file
			this.folderName = null;				// the folder to where it should be uploaded; if not provided by the user, the userId is used as value
			this.displayName = null;			// the name to be displayed in the 'fileNameLabel'
			this.accept = null;					// the value for accept file types
			this.context = config.context || null;					// the value for accept file types
			this.compress = config.compress || false;					// the value for accept file types
			this.meta = {},	

			this.createVariants = config.createVariants || false;
			this.compress = config.compress || false;
			this.extractZip = config.extractZip || false;
			this.listFilesInZip = config.listFilesInZip || false;
			this.normalWithPath = config.normalWithPath || false;
			this.appJar = config.appJar || false;
			this.resizeSize = config.resizeSize	 || false;				
			this.crop = config.crop	 || false;				
			// any specific config and upload params,
			
			this.onUploadSuccess = config.onUploadSuccess || null;
			this.onUploadFail = config.onUploadFail || null;
			this.onDelete = config.onDelete || null;
			
			this.options = config.options || {
				autoUpload :  true
			}
			this.dropZone = config.dropZone || angular.element("body");
			
			this.hidefileBrowse = true;			// the name to be displayed in the 'fileNameLabel'
			this.container = config.container || angular.element("body");//holder where the uploader attach form	
			this.previewHolder = config.previewHolder || null;//conteiner for showing preview			
			this.previewTemplate = config.previewTemplate || null; // for passing custom preview template inform of string
			this.defaultPreview = config.defaultPreview || "DEF_ATTACHMENT"; // default image preview in case of failing to load image thumb
			this.showPreview = (typeof config.showPreview !== "undefined") ? config.showPreview : true;
		}

		uploader.prototype = {
			init : function(){
				var _fileUploadConfig;
				_initTemplates();
				var _that = this;
				_that.formEl  =  $(_that._getUploadForm());
				_that.uploadedFiles = {};
				if(!_that.container){
					_that.container = $("body");
				}
				_that.container.append(_that.formEl);
				
				/*if(_that.previewHolder){
					var $scope = $rootScope.$new();
					var tpl = $("div")
					//tpl.attr("ng-controller","previewController")
					$compile(tpl)($scope);
					_that.previewHolder.append(tpl);
				}*/
				_fileUploadConfig = _that._getFileUploadConfig();
				_that.deleteFiles = function(index){
					delete _that.uploadedFiles[index];
				}
				$(_that.formEl).fileupload(_fileUploadConfig)
					.bind('fileuploaddone', function(e, data){
						var accessUrl = "",
							response ="",
							fileName ="",
							fileInfo = {},
							attId;
						var dropZone = _that.dropZone;
						data.progressBar.find('[data-name="progress-strip"]').css("width","100%");

						try{
							response = data.response();
							if(_that.type === constants.TYPE_ANONYMOUS){
								accessUrl = response.result.file["access-url"];						
								fileInfo = {
									fileSrc : accessUrl,
									fileName : ""
								};
							}else{
								attId = response.result.file["atid"];
								fileInfo = {
									attachmentId : attId,
									fileSrc : $$util.getFromAttachment.url(attId),
									fileName : $$util.getFromAttachment.name(attId),
									fileType : $$util.getFromAttachment.type(attId),
									resourceId : $$util.getFromAttachment.resourceId(attId),
									resourceURL : $$util.getFromAttachment.resourceURL(attId)
								};
							}
						}catch(e){
							accessUrl = "";
						}
						_that.fileInfo = fileInfo;
						var keys = Object.keys(_that.uploadedFiles) || [];
						var key = keys.length + 1;
						_that.uploadedFiles[key] = fileInfo;
							data.progressBar.hide();
						$timeout(function(){
						},100)
						if(dropZone && dropZone.hasClass("dragover")) dropZone.removeClass("dragover");
						if(fileInfo.fileSrc) fileInfo.fileSrc = $$util.ImageManager.refresh(fileInfo.fileSrc);
						if(_that.showPreview) _that._createPreview();
						if(_that.onUploadSuccess && typeof _that.onUploadSuccess === "function") _that.onUploadSuccess(fileInfo);
					})
					.bind('fileuploadfail', function(e, data){
						if(typeof _that.onUploadFail === "function"){
							_that.onUploadFail.call(e, data)
						}else{
							console.log('Upload failed');
						}

					}).bind('fileuploadsubmit', function(e, data){
						var progressBartpl = $(progressBar);
						data.progressBar  = progressBartpl;
						if(_that.previewHolder){
							_that.previewHolder.append(progressBartpl);							
						}else{
							_that.container.append(progressBartpl);
						}
						if(_that.type === constants.TYPE_AUTH){
			            	_that.customHeaders = {
								scope : "Attachment",
								target : _that.serviceType || "Upload",
								responsetype : "json",
								headers : {}
							};
			            }else if (_that.type === constants.TYPE_ANONYMOUS) {
			            	_that.customHeaders = _that._anonymousUploadConfig();
							data.formData = _that.customHeaders.formParams;
			            }
					})
					.bind('fileuploadprogress', function (e, data) {
					    // Log the current bitrate for this upload:
					    var width = parseInt(data.loaded / data.total * 100, 10);
					    if(width) width = width + "%";
					    data.progressBar.find('[data-name="progress-strip"]').css("width",width);
					    console.log(data.bitrate);
					});

				_that._attachDragEventsListeners();
			},

			getFiles : function(){
				var arr = $.map(this.uploadedFiles, function(el) { return el; })
				return arr;
			},

			browseFile : function(){
				//click callback of pagelevel upload button
			    this.formEl.find("[data-id='add-file']").click();
			},

			_getFileUploadConfig : function(){
				var _that = this;				 
				var fileUploadConfig = angular.extend({},_that,{
					//fileupload config					
		 			loadImageMaxFileSize : _that.MAX_FILE_SIZE,
		 			uploaderType : _that.type,		 			
		 			beforeSend: function(xhr, data){
		 				//to add custom headers to request
		 				var file = data.files[0],
           					customHeaders = _that.customHeaders;

			           	xhr.setRequestHeader(constants.REQUESTTYPE, constants.FILEOPERATION);
           				xhr.setRequestHeader(constants.SCOPE, customHeaders.scope);
            			xhr.setRequestHeader(constants.TARGET, customHeaders.target);
            			xhr.setRequestHeader(constants.RESPONSETYPE, customHeaders.responsetype);

			            if(customHeaders.headers){
							for(var header in customHeaders.headers){
								xhr.setRequestHeader(header, customHeaders.headers[header]);
							}
						}


						//custom callback from user
						_that.beforeUploadCallback && _that.beforeUploadCallback(xhr,data)		 				
		 			}		 			

		 		});

		 		if(gateway){
		 			//custom gateway
		 			fileUploadConfig.url = gateway;
		 		}

		 		if(!_that.enableMultiFileUpload){
		 			fileUploadConfig.singleFileUploads = true;
		 		}

		 		if(typeof _that.options !== null){	 			
					fileUploadConfig = angular.extend(fileUploadConfig, _that.options);
				}
				

				return fileUploadConfig;
			},

			_getUploadForm : function(){
				//create upload form based on configuration
				var fileInputTag;
				var uploadForm	= '<form id="fileupload" action="" method="POST" enctype="multipart/form-data" style="">'+
						        	/*'<!-- The global progress state -->'+
						            '<div class="col-lg-5 fileupload-progress fade">'+
						                '<!-- The global progress bar -->'+
						                '<div class="progress progress-striped active" role="progressbar" aria-valuemin="0" aria-valuemax="100">'+
						                    '<div class="progress-bar progress-bar-success" style="width:0%;"></div>'+
						                '</div>'+
						                '<!-- The extended global progress state -->'+
						                '<div class="progress-extended">&nbsp;</div>'+
						            '</div>'+*/
						        	'<div class="row fileupload-buttonbar" >'+
						            	'<div class="col-lg-7">';
				if(this.enableMultiFileUpload){
					fileInputTag = '<input type="file" name="files[]" multiple  data-id="add-file">'
				}else{
					fileInputTag = '<input type="file" name="files" data-id="add-file">'

				}

				if(!this.hidefileBrowse){
					uploadForm += '<span class="btn btn-success fileinput-button">'+
					                    '<i class="glyphicon glyphicon-plus"></i>'+
					                    '<span>Add files...</span>'+
					                    fileInputTag +
					                '</span>';				            
				}else{
					//hide form file browse button
					uploadForm += '<span class="btn btn-success fileinput-button" style="display:none">'+
					                    '<i class="glyphicon glyphicon-plus"></i>'+
					                    '<span>Add files...</span>'+
					                    fileInputTag+
					                '</span>';			
				}

				if(!(this.options && this.options.autoUpload)){
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
						        '</div>'+
						        '<!-- The table listing the files available for upload/download -->'+
						        '<!--<table role="presentation" class="table table-striped"><tbody class="files"></tbody></table> -->'+
						    '</form>';
				return uploadForm;
			},

			_anonymousUploadConfig : function() {
				var target = "Normal",
					formParams = [],
					headers = {};

				//this.formEl.querySelector('[name="flnm"]').value = this.fileName;

				// If a thumbnail image needs to be created
				if(this.createVariants) {
					target = "ImageWithProcessing";
					formParams.push({name:"resize",value:"true"});
				}

				if(this.compress){
					target = "ImageWithProcessing";
					formParams.push({name:"resize",value:"true"});
					//formParams.resize = "true";
				}
				if(this.extractZip){
					target = "Compressed";
				}
				if(this.listFilesInZip){
				}

				if(this.normalWithPath){
					target = "NormalWithPath";
					fsPath = this.fsPath || "";
				}
				if(this.appJar) {
					target = "AppLibrary";
				}
				if(this.resizeSize){
					formParams.push({name:"resize-to",value:this.resizeSize});
					formParams.push({name:"keep-aspect-ratio",value:"true"});
					//formParams["resize-to"] = this.resizeSize;
					//formParams["keep-aspect-ratio"] = "true";
				}
				if(this.crop){
					var croparea = this.crop.left.toString()+','+
									this.crop.top.toString()+','+
									this.crop.right.toString()+','+
									this.crop.bottom.toString()
					formParams.push({name:"crop-region",value:croparea});
					formParams.push({name:"crop",value:"true"});
					//formParams["resize-to"] = this.resizeSize;
					//formParams["keep-aspect-ratio"] = "true";
				}


				// context
				if(this.context){
					switch(this.context.type){
						case "group" :
							headers["Context"] = "Group";
							headers["replace-group"] = this.context.id;
						break;
						case "user" :
							headers["Context"] = "User";
							headers["replace-profile"] = this.context.id;
						break;
						case "account" :
							headers["Context"] = "Account";
							headers["replace-account"] = this.context.id;
						break;
						case "apps" :
							headers["Context"] = "Apps";
							if(this.context.id){
								headers["replace-app"] = this.context.id;
							}
						break;
						case "account-thumb" :
							headers["Context"] = "AccountTile";
							headers["replace-account"] = this.context.id;
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
			},

			_attachDragEventsListeners : function(){
				var _self = this;
				var dropZone = _self.dropZone;
				$(dropZone).on("dragover",function(e){
					//show dropZone effect on dragging over the body
					if(dropZone && !dropZone.hasClass("dragover")) dropZone.addClass("dragover");
					
				});

				$(dropZone).on("dragleave",function(e){
					//show unbind effect on dragging over the body
					var dropZone = _self.dropZone;
					if(dropZone && dropZone.hasClass("dragover")) dropZone.removeClass("dragover");
				});

				$(document).bind('drop dragover', function (e) {
					//show restrict the dropzone in the specified area
					//else it will take entire body as drop area
		           // dropEl.text("Drop Files Here")
		            e.preventDefault();
		        });
			},

			_createPreview : function(data){
				var that = this;
				var holder = that.previewHolder;
				var fileInfo =  that.fileInfo;			
				var previewTemplate = that.previewTemplate  || previewTpl.slice(0);
				var tplnumber = Object.keys(that.uploadedFiles).length;
				if(!holder || (Array.isArray(holder) && holder.length === 0)){
					return;
				}
				if(typeof previewTemplate === "string"){
					previewTemplate = previewTemplate.replace("{{file-src}}",fileInfo.fileSrc)
									.replace("{{file-name}}",fileInfo.fileName)
									.replace("{{default-preview}}",that.defaultPreview);
					previewTemplate =  $compile(previewTemplate)($(holder).scope());
				}else if( typeof previewTemplate === "object"){
					previewTemplate.find("[data-name = 'file-src']").attr({src:fileInfo.fileSrc,"vs-err-src":that.defaultPreview});
					previewTemplate.find("[data-name = 'file-name']").html(fileInfo.fileName);
				}


				previewTemplate.find("[data-name = 'delete']").click(function(e){
					that.deleteFiles(tplnumber);
					previewTemplate.fadeOut(300, function(){ $(this).remove();});
					that.onDelete && that.onDelete(e);
				})
				$(holder).append(previewTemplate);

			}
			
		}	
		
		return exposedAPIs;
		/////////////////////////////
        function getUploader(config){
        	var newUploader = new uploader(config);
        	return newUploader;
        }

        function deleteItem(){
        	console.log("deleted")
        }
        function _initTemplates(){
			//inject preview template format to document for creating preview by fileupload library
			var $_body = $("body");
			if($_body && !$_body.isPreviewTplAdded){
				$_body.append(uploadPreviewTpl);
				$_body.append(downloadPreviewTpl);				
			}
		}


	}
})();
(function () {
	"use strict";
	angular
		.module("docex")
		.service("vsCropperService",vsCropperService);
	vsCropperService.$inject = [];
	
	function vsCropperService(){	
		
		var cropper = null;
		var vsCropper = function(config){
			this.Cropper = null;
			this.console = null;
			this.holder = null;
			this.container = null;
			this.image = null;

			this.download = null;
			this.actions = null;
			this.dataX = null;
			this.dataY = null;
			this.dataHeight = null;
			this.dataWidth = null;
			this.dataRotate = null;
			this.dataScaleX = null;
			this.dataScaleY = null;

			this.cropper = null;
		}
		/////////////////////////////
		vsCropper.prototype = {
			init : function(config) {
				if(this.cropper){
					//if initialized already
			 		this.cropper.crop();
			 		this.image.classList.add("cropper-hidden");
					angular.element(this.container).find(".cropper-container").removeClass("cropper-hidden");
			 	}else{
					this.Cropper = window.Cropper;
					this.console = window.console || { log: function () {} };
					this.holder = (config.holder) ? config.holder[0] : document;
					this.container = (config.imageContainer) ? config.imageContainer[0] : document;
					this.image = this.container.getElementsByTagName('img').item(0);

					this.download = angular.element(this.holder).find('#download');
					this.actions = angular.element(this.holder).find('#actions');
					this.dataX = angular.element(this.holder).find('#dataX');
					this.dataY = angular.element(this.holder).find('#dataY');
					this.dataHeight = angular.element(this.holder).find('#dataHeight');
					this.dataWidth = angular.element(this.holder).find('#dataWidth');
					this.dataRotate = angular.element(this.holder).find('#dataRotate');
					this.dataScaleX = angular.element(this.holder).find('#dataScaleX');
					this.dataScaleY = angular.element(this.holder).find('#dataScaleY');
					this.options = {
				        aspectRatio: "",
				        preview: '.img-preview',
				        build: function () {
				          console.log('build');
				        },
				        built: function () {
				          console.log('built');
				        },
				        cropstart: function (e) {
				          console.log('cropstart', e.detail.action);
				        },
				        cropmove: function (e) {
				          console.log('cropmove', e.detail.action);
				        },
				        cropend: function (e) {
				          console.log('cropend', e.detail.action);
				        },
				        crop: function (e) {
				          	var data = e.detail;

				         	console.log('crop');
				         	try{
					          	this.dataX.value = Math.round(data.x);
					          	this.dataY.value = Math.round(data.y);
					          	this.dataHeight.value = Math.round(data.height);
					          	this.dataWidth.value = Math.round(data.width);
					          	this.dataRotate.value = !_isUndefined(data.rotate) ? data.rotate : '';
					          	this.dataScaleX.value = !_isUndefined(data.scaleX) ? data.scaleX : '';
					         	this.dataScaleY.value = !_isUndefined(data.scaleY) ? data.scaleY : '';
					        }catch(e){

					        }
				        },
				        zoom: function (e) {
				          console.log('zoom', e.detail.ratio);
				        }
				    };
				 	this.cropper = new Cropper(this.image, this.options);
				 }
			},

			getCoordinates : function(){
				try{
					return this.cropper.getData()
				}catch(e){
					console.log("cropper not initialized");
					return null;
				}
			},
			clear : function(){
				try{
					this.cropper.clear();
					this.image.classList.remove("cropper-hidden");
					angular.element(this.container).find(".cropper-container").addClass("cropper-hidden")
				}catch(e){
					console.log("cropper not initialized");
				}
			}

			
		}

		function _isUndefined(obj) {
		    return typeof obj === 'undefined';
		}

		var exposedAPIs = {

			vsCropper:vsCropper
		};
		return exposedAPIs;	
	}
})(); 
(function () {
	/* Comments*/
	"use strict";
	angular
		.module("docex")
		.directive("addFileBtn",addFile);
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
			scope.uploadConfig.hidefileBrowse = scope.config.hidefileBrowse || false;
			scope.uploadConfig.options = {
				autoUpload :  scope.config.autoUpload || false,

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
		.module("docex")
		.directive("vsUpload",vsUpload);
	vsUpload.$inject = ['vsUploader'];
	function vsUpload($$vsUploader){
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
			if(!scope.uploadConfig){
				return;
			}
			scope.uploadConfig.thisEl = element;
			scope.uploadConfig.hidefileBrowse = scope.config.hidefileBrowse || false;
			scope.uploadConfig.options = {
				autoUpload :  scope.config.autoUpload || false,

			};
			scope.uploadConfig.onUploadSuccess = function(data){
				scope.config.uploadedFiles = scope.uploader.getFiles();
				scope.config.onUploadSuccess && scope.config.onUploadSuccess(data);
			}
			scope.uploadConfig.onDelete = function(){
				scope.config.uploadedFiles = scope.uploader.getFiles();
			}
			scope.uploader = $$vsUploader.getUploader(scope.uploadConfig);
			scope.uploader.init(scope.uploadConfig);
			element.click(function(){
				scope.uploader.browseFile();
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
	angular
		.module("account")
		.controller("ImageUploadController",ImageUploadController);
	ImageUploadController.$inject = [
		'$scope',
		'$state',
		'$rootScope',
		'$translate',
		'Docex.Profile',
		'accountService',
		'accountLogic',
		'accountStatePaths',
		'accountConstants',
		'Docex.Constants',
		'Docex.Uploader',
		'Docex.Validation',
		'Docex.Util',
		'Docex.Notification',
		'Docex.Browser',
		'prefillOptions',
		'Docex.UI.TopBarConfig',
		'breadcrumb.service',
		'$dialog',
		'vsCropperService'
	];
	
	function ImageUploadController(
		$scope,
		$state,
		$rootScope,
		$translate,
		$$profile,
		$$accountService,
		$$logic,
		$$statePaths,
		$$accountConstants,
		$$docexConstants,
		$$uploader,
		$$validator,
		$$util,
		$$notify,
		$$browser,
		$$prefilloptions,
		$$topBarConfig,
		$$breadCrumb,
		$$dialog,
		$$vsCropperService
	){	
		$scope.context = ($state.params && $state.params.context) || "";
		var files = [];
		var TRANSPREFIX =  $$logic.getTranslateObjectPrefix();
		var myaccountId,
			gFlags = {},
			gData,
			gConstants,
			MyAccount,
			ownaccountText,
			uploaderObj,
			transPrefix = $$accountConstants.TRANSPREFIX;

		$scope.config = {          
            //formEl  :  $('#fileupload'),
            autoUpload :true,
            hidefileBrowse :true,
            type : "anonymous",
            compress :true,
            context : {type:"account" ,id:$$profile.get("aid")},
            dropZone : $("#acc-img"),
            container : $("#acc-img"),
            onUploadSuccess : afterUpload,
            enableMultiFileUpload : false,
            showPreview : false,
            /*crop:{left:0,top:0,right : 50,bottom:55},*/

            accept : "image/*",
            resizeSize : ""


        };
        
        $scope.newconfig = {          
            //formEl  :  $('#fileupload'),
            autoUpload :true,
            hidefileBrowse :true,
            type : "authenticated",
            compress :true,
            dropZone : $("#prv-img"),
            container : $("#prv-img"),
            onUploadSuccess : null,
            enableMultiFileUpload : true,
            previewHolder : $("#prv-img"),
            previewTemplate : null,
            defaultPreview :"DEF_LINK",

        };
		
		function setBreadCrumb(params){		
		}

		function _initConfigurations(){
			//variable initialization
			var subtext,text,state,breadcrumbParams,

			myaccountId = $$profile.get("aid");

			gConstants = {
	            everbinding: "EVERBINDING",
	            administration : "ADMIN"
	        };
			
		}

		function getThumbnailURL(url){
			
		    return url.replace(/(\.[^.]+$)/, $$docexConstants.get("THUMB_SUFFIX") + "$1");
		}

		function getAccountDetails(myaccount,callback){
			//showing account details in header			
			var getAccountConfig = {};
			getAccountConfig.ResourceType ="Account";
				//if my account not need account Id
				getAccountConfig.ResourceId = $$profile.get("aid");
				getAccountConfig.Type = "pd";			
			getAccountConfig.onGetAcntDetails = function(response){
				if(myaccount){
					$scope.edit = true;
				}
				onGetAcntDetails(response);
				callback && callback()
			}
			$$accountService.getAccountDetails(getAccountConfig);			
		}

		function onGetAcntDetails(response){
			var registerBreadCrumb = false,interval,breadcrumbParams,
				subtext,text,state,
				toState = $$statePaths.ACCOUNT_DETAILS;
			$scope.accountInfo = response;
			$scope.imageUrl = $$util.ImageManager.get($scope.accountInfo.imageUrl) || "";
			$scope.partnerId = $scope.accountInfo.accountId || "";

			//needed in edit mode , 
			$scope.profileIconUrl = $$util.ImageManager.get( getThumbnailURL($scope.accountInfo.imageUrl));

			
			if($scope.editMode){
				//not need to set these values in view mode				
            }
		}      
        function afterUpload(fileInfo){

			gFlags.imageUploaded = true;
			$scope.imageUrl = fileInfo.fileSrc;
			files.push(fileInfo);
			$scope.$parent.$digest();
		}

		function configurePage() { 
	 	}

		$scope.doBrowse = function(imageMode){
			if(typeof imageMode === "undefined"){
				imageMode = true;
			}
			if(!uploaderObj){
				if(imageMode){

				}
				uploaderObj = $$logic.getUploader({context:"account"},afterUpload);
			}
			
            var image, filename,isIcon,
				uploaderIcon = uploaderObj.uploaderIcon,
				uploader = uploaderObj.uploader;
            if(true){
                uploader.folderName = $$util.getFolderNameForUpload($scope.imageUrl);
                uploaderIcon.folderName = $$util.getFolderNameForUpload($scope.imageUrl);
                if(isIcon) //have to set the "createvariants" as "true" if we also need to create the icon sized image
                    	uploader.createVariants = false;
                else
                    	uploader.createVariants = imageMode;
                if(imageMode){ //changing the large account image
                    filename = $scope.imageUrl ? uploaderObj.getFileNameFromUrl($scope.imageUrl) : uploaderObj.getNewFileName();
                    //uploader.fileName = filename;
                    uploader.browseFile();
                }else{ //changing the icon sized account image
                	uploaderIcon.onUploadEnd = function(imageUrl){

                		$scope.profileIconUrl = $$util.ImageManager.refresh(imageUrl);
						$scope.$parent.$digest();
                	}
                    filename = $scope.imageUrl ? uploaderObj.getFileNameFromUrl(uploaderObj.getThumbnailURL($scope.imageUrl)) : uploaderObj.getNewFileName();  //for getting the filename on icon sized image, using the "getThumbnailURL" API
                    uploaderIcon.fileName = filename;
                    uploaderIcon.browseFile();
                }
            }
        };

        /*$scope.crop1 = new $$vsCropperService.vsCropper();					
		$scope.crop2 = new $$vsCropperService.vsCropper();
		$scope.initCropper = function(type){
			$scope.crop1.init({
				holder:$("#acc-img"),
				imageContainer:$("#img-container")
			});	
		};*/

		$scope.getCoordinates = function(){
			var a=  $scope.crop1.getCoordinates() ;
			$scope.pos = a.x +" "+a.y
		};

		$scope.cancelCrop = function(){
			$scope.crop1.clear();
		};
		
		$scope.cropImage = function(){
			$$dialog.open({
				size:"lg",
				templateUrl:"CROPPER_TEMPLATE",
				data:{
					imageUrl : $scope.imageUrl,
					uploaderConfig : $scope.config
				}
			})
		};
		(function(){

			_initConfigurations(); //constructor
			getAccountDetails();
		
			$$topBarConfig.resetTopBar();
		})();
	}
})(); 
(function () {
	"use strict";
	angular
		.module("docex")
		.controller("CropDialogController",CropDialogController);
	CropDialogController.$inject = ['$scope','vsCropperService','$timeout','$dialog','vsUploader'];
	
	function CropDialogController($scope,$$vsCropperService,$timeout,$dialog,$$vsUploader){
		var dialogScope = $scope.DialogScope;
		var vm = this;
		vm.imageUrl = dialogScope.data.imageUrl;
		vm.cropper = new $$vsCropperService.vsCropper();
		vm.uploader = new $$vsUploader.getUploader(dialogScope.data.uploaderConfig);
		vm.uploader.init();
		$timeout(function(){
			vm.cropper.init({
				holder:$("#crop-img"),
				imageContainer:$("#crop-img-container")
			});	

		},200);
		vm.close = function(){
			$dialog.close();
		}
	}
})(); 