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