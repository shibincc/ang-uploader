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