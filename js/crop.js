(function () {
	"use strict";
	angular
		.module("sbc_uploader")
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
				var self = this;
				this.Cropper = window.Cropper;
				this.console = window.console || { log: function () {} };
				this.holder = (config.container) ? config.container[0] : document;
				this.container = this.holder.querySelector('.img-container');
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
			 	if(this.cropper){
			 		this.cropper.crop();
			 	}else{
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
					this.cropper.clear()
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
	"use strict";
	angular
		.module("sbc_uploader")
		.controller("cropperController",cropperController);
	cropperController.$inject = ['$scope','vsCropperService'];
	
	function cropperController($scope,$$vsCropperService){	
		$scope.crop1 = new $$vsCropperService.vsCropper();					
		$scope.crop2 = new $$vsCropperService.vsCropper();
		$scope.initCropper = function(type){
			if(type == 1){
				$scope.crop1.init({
					container:$("#crop-container"+type)
				});	
			}else{
				$scope.crop2.init({
					container:$("#crop-container"+type)
				});				

			}
		}

		$scope.getCoordinates = function(){
			$scope.pos = $scope.crop1.getCoordinates();
		}

		$scope.cancelCrop = function(){
			$scope.crop1.clear();
		}
	}
})(); 