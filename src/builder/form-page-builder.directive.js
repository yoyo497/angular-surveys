
angular.module('mwFormBuilder').directive('mwFormPageBuilder', function ($rootScope) {

    return {
        replace: true,
        restrict: 'AE',
        require: '^mwFormBuilder',
        scope: {
            formPage: '=',
            formObject: '=',
            isFirst: '=',
            isLast: '=',
            readOnly: '=?',
            uploadUrl: '=',
        },
        templateUrl: 'mw-form-page-builder.html',
        controllerAs: 'ctrl',
        bindToController: true,
        controller: function($timeout, mwFormUuid, mwFormClone, mwFormBuilderOptions, IScrollEvents, Upload, $q, $){
            var ctrl = this;
            var ignoreCloseEdit = false;
            // Put initialization logic inside `$onInit()`
            // to make sure bindings have been initialized.
            ctrl.$onInit = function() {
                ctrl.hoverEdit = false;
                ctrl.formPage.namedPage = !!ctrl.formPage.name;
                ctrl.isFolded = false;
                sortElementsByOrderNo();

                ctrl.sortableConfig = {
                    disabled: ctrl.readOnly,
                    ghostClass: "beingDragged",
                    group: "survey",
                    handle: ".inactive",
                    //cancel: ".not-draggable",
                    chosenClass: ".page-element-list",
                    onEnd: function(e, ui) {
                        updateElementsOrderNo();
                    }
                };

                ctrl.activeElement = null;
            };

            ctrl.unfold = function(){
                ctrl.isFolded = false;
            };
            ctrl.fold = function(){
                ctrl.isFolded = true;
            };


            function updateElementsOrderNo() {
                for(var i=0; i<ctrl.formPage.elements.length; i++){
                    ctrl.formPage.elements[i].orderNo = i+1;
                }
            }


            function sortElementsByOrderNo() {
                ctrl.formPage.elements.sort(function(a,b){
                    return a.orderNo - b.orderNo;
                });
            }
            ctrl.pageNameChanged = function(){
                $rootScope.$broadcast('mwForm.pageEvents.pageNameChanged', {page: ctrl.formPage});
            };



            ctrl.addElement = function(type, src){
              if(!type){

                    type=mwFormBuilderOptions.elementTypes[0];
                }
                var element = createEmptyElement(type, ctrl.formPage.elements.length + 1);

              if (type === 'image') {
                element.image = {src : src};
              }
              ctrl.activeElement=element;
                ctrl.formPage.elements.push(element);
            };

            ctrl.cloneElement = function(pageElement, setActive){
                var index = ctrl.formPage.elements.indexOf(pageElement);
                var element = mwFormClone.cloneElement(pageElement);
                if(setActive){
                    ctrl.activeElement=element;
                }
                ctrl.formPage.elements.splice(index,0, element);

            };

            ctrl.removeElement = function(pageElement){
              var index = ctrl.formPage.elements.indexOf(pageElement);
              ctrl.formPage.elements.splice(index, 1);
              ctrl.activeElement = null;
            };

            ctrl.moveDownElement= function(pageElement){
                var fromIndex = ctrl.formPage.elements.indexOf(pageElement);
                var toIndex=fromIndex+1;
                if(toIndex<ctrl.formPage.elements.length){
                    arrayMove(ctrl.formPage.elements, fromIndex, toIndex);
                }
                updateElementsOrderNo();
            };

            ctrl.moveUpElement= function(pageElement){
                var fromIndex = ctrl.formPage.elements.indexOf(pageElement);
                var toIndex=fromIndex-1;
                if(toIndex>=0){
                    arrayMove(ctrl.formPage.elements, fromIndex, toIndex);
                }
                updateElementsOrderNo();
            };

            ctrl.isElementTypeEnabled = function(elementType){
                return mwFormBuilderOptions.elementTypes.indexOf(elementType) !== -1;
            };

            ctrl.addQuestion = function(){
              if (validateOpenElement() === true) {
                ctrl.addElement('question');
                ignoreCloseEdit = true;
              } else {
                $rootScope.$emit('validateForm');
              }
            };

            ctrl.addImage = function(src){
              if (validateOpenElement() === true) {
                ctrl.addElement('image', src);
                ignoreCloseEdit = true;
              } else {
                $rootScope.$emit('validateForm');
              }
            };

            ctrl.addParagraph= function(){
              if (validateOpenElement() === true) {
                ctrl.addElement('paragraph');
                ignoreCloseEdit = true;
              } else {
                $rootScope.$emit('validateForm');
              }
            };

            ctrl.isElementActive= function(element){
                return ctrl.activeElement==element;
            };

            ctrl.selectElement = function(element){
              if (validateOpenElement() === true) {
                $rootScope.$emit(IScrollEvents.REFRESH);
                ctrl.activeElement = element;
                ignoreCloseEdit = true;
              } else {
                if (ctrl.activeElement.id !== element.id) {
                  $rootScope.$emit('validateForm');
                }
              }
            };

            ctrl.onElementReady = function(){
                $timeout(function(){
                    ctrl.activeElement=null;
                });
            };

          ctrl.selectImageButtonClicked = function (image) {
            if (image && validateOpenElement() === true) {
              var promises = [];
              promises.push(Upload.upload({
                url: ctrl.uploadUrl,
                method: 'POST',
                data: {
                  file: image,
                  maxWidth: 876,
                },
              })
                .then(function (response) {
                  ctrl.addImage(response.data.filePath);
                })
                .catch(function (error) {
                  return $q.reject(error);
                }));
              return $q.all(promises);
            } else {
              $rootScope.$emit('validateForm');
              return $q.reject('no images or uploadurl defined');
            }
          };

          function validateOpenElement() {
            var noElementSelected = ctrl.activeElement === null;
            var validElement = true;

            if (noElementSelected === false) {
              var element = ctrl.activeElement[ctrl.activeElement.type];
              switch(ctrl.activeElement.type) {
                case 'question' :
                  validElement = (element.text != null && element.type != null);
                  if(element.type === 'radio' || element.type === 'checkbox') {
                    validElement = validElement === false ? false : element.offeredAnswers.length > 1;
                    element.offeredAnswers.forEach(function(answer) {
                      validElement = validElement === false ? false : (answer.text != null && answer.text !== '') || (answer.value != null && answer.value !== '');
                    });
                  }
                  break;
                case 'image' : validElement = element.src != null; break;
                case 'paragraph' : validElement = (element.html !== '' && element.html != null); break;
              }
            }
            return noElementSelected || validElement;
          }

            function createEmptyElement(type,orderNo){
                return {
                    id: mwFormUuid.get(),
                    orderNo: orderNo,
                    type: type
                };
            }

            function arrayMove(arr, fromIndex, toIndex) {
                var element = arr[fromIndex];
                arr.splice(fromIndex, 1);
                arr.splice(toIndex, 0, element);
            }

            ctrl.hoverIn = function(){
                ctrl.hoverEdit = true;
            };

            ctrl.hoverOut = function(){
                ctrl.hoverEdit = false;
            };


            ctrl.updateElementsOrderNo = updateElementsOrderNo;

            // Prior to v1.5, we need to call `$onInit()` manually.
            // (Bindings will always be pre-assigned in these versions.)
            if (angular.version.major === 1 && angular.version.minor < 5) {
                ctrl.$onInit();
            }


            $(document).on('click', function(element) {
              if (ctrl.activeElement != null && ignoreCloseEdit === false) {
                var targetElement = element.target;
                var elementClickedOutsideEdit = targetElement.closest('.mw-form-page-element-builder.active') == null;
                  if (elementClickedOutsideEdit === true) {
                  if (validateOpenElement() === true) {
                    ctrl.activeElement=null;
                    $timeout(function() {
                      $rootScope.$emit(IScrollEvents.REFRESH);
                    },0);
                  } else {
                    $rootScope.$emit('validateForm');
                  }
                }
              } else {
                ignoreCloseEdit = false;
              }
            });


            ctrl.$onDestroy = function() {
              $(document).off('click');
            };

        },
        link: function (scope, ele, attrs, formBuilderCtrl){
            var ctrl = scope.ctrl;
            ctrl.possiblePageFlow = formBuilderCtrl.possiblePageFlow;
            ctrl.moveDown= function(){

                formBuilderCtrl.moveDownPage(ctrl.formPage);
            };

            ctrl.moveUp= function(){
                formBuilderCtrl.moveUpPage(ctrl.formPage);
            };

            ctrl.removePage=function(){
                formBuilderCtrl.removePage(ctrl.formPage);
            };

            ctrl.addPage=function(){
                formBuilderCtrl.addPageAfter(ctrl.formPage);
            };

            scope.$watch('ctrl.formPage.elements.length', function(newValue, oldValue){
                if(newValue!=oldValue){
                    ctrl.updateElementsOrderNo();
                }
            });
            ctrl.options = formBuilderCtrl.options;
            ctrl.onImageSelection = formBuilderCtrl.onImageSelection;
        }
    };
});
