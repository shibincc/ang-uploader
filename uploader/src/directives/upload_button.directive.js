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