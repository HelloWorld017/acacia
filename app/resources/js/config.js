let app = angular.module('acacia', ['ngRoute', 'ngMaterial','ngCookies', 'mdColorPicker']);
app.controller('textControl', ($scope) => {
	['chara', 'script', 'original'].reduce((prev, curr) => {
		prev.push(curr + 'Border', curr + 'BorderSize', curr + 'Text', curr + 'Toggle', curr + 'FontName', curr + 'FontSize');
		return prev;
	}, []).forEach((v) => {
		$scope[v] = __args__[v];
		$scope.$watch(v, () => {
			ipcRenderer.send('update-config', v, $scope[v]);
		});
	});
});

app.controller('toggleControl', ($scope) => {
	['click', 'buerg', 'fixedChara'].map((v) => v + 'Toggle').forEach((v) => {
		$scope[v] = __args__[v];
		$scope.$watch(v, () => {
			if(v === 'clickToggle') ipcRenderer.send(v, $scope[v]);
			else ipcRenderer.send('update-config', v, $scope[v]);
		});
	});
});

$('.tabular.menu .item').tab();
