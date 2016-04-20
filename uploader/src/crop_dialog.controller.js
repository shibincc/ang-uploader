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