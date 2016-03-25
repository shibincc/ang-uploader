(function () {
	"use strict";
	angular
		.module("sbc_uploader",['blueimp.fileupload'])
})();

(function () {
 	"use strict";
 	angular
 		.module("sbc_uploader")
 		.controller("UploaderController",UploaderController);
 	UploaderController.$inject = ['$scope'];
 	
 	function UploaderController($scope){
        var gateway = "/filegateway";
        var dropEl = $("#dropzone");
        var config = {
            scope : "Attachment",
            target : "Upload",
        };
                /*form : this.formEl,
                callback : this.onUpload.bind(this),
                progressHandler : this.progressHandler,
                gateway : $$DocexConfig.get("fsGateway"),
                headers : {
                    responsetype : "json"
                }*/
 		$scope.options = {
 			url:gateway,
 			dropZone:dropEl,
            beforeSend: function(xhr, data) {
                debugger;
                var file = data.files[0];
                xhr.setRequestHeader('RequestType', "FileOperation");
                xhr.setRequestHeader('scope', config.scope);
                xhr.setRequestHeader('target', config.target);
                xhr.setRequestHeader('responsetype', "json");
            }
 		}

 		$scope.$on('$viewContentLoaded', function(){
            $(document).bind('drop dragover', function (e) {
                e.preventDefault();
            });
        });
        $(document).bind('drop dragover', function (e) {
            /*dropEl.text("Drop Files Here")*/
            e.preventDefault();
        });

        /*$('#fileUpload')
            .bind('fileuploadsubmit', function (e, data) {
                e; data; debugger
            })*/
                
    };
 })();  

 (function () {
 	"use strict";
 	angular
 		.module("sbc_uploader")
 		.controller("FileDeleteController",FileDeleteController);
 	FileDeleteController.$inject = ['$scope', '$http',];
 	
 	function FileDeleteController($scope, $http){
 		var file = $scope.file,
            state;
        if (file.url) {
            file.$state = function () {
                return state;
            };
            file.$destroy = function () {
                state = 'pending';
                return $http({
                    url: file.deleteUrl,
                    method: file.deleteType
                }).then(
                    function () {
                        state = 'resolved';
                        $scope.clear(file);
                    },
                    function () {
                        state = 'rejected';
                    }
                );
            };
        } else if (!file.$cancel && !file._index) {
            file.$cancel = function () {
                $scope.clear(file);
            };
        }	
 	}
 })();