//v. 0.2.8
var DELAY_KEY = "DELAY";
var DELAY_RANDOM_KEY = "DELAY_RANDOM";
var PAUSE_KEY = "PAUSE";
var audioCtx = new (window.AudioContext || window.webkitAudioContext || window.audioContext);
$( document ).ready(function() {
	if (!window.location.href.includes("SearchResult")){
	  return
	}
	if ($("#g-recaptcha-response")[0]){
		speak('Капча');
		return
	}
	if (window.location.href.includes("Error")){
	  window.history.back();
	}
	$(document).keyup(function (e){
		if(e.keyCode == 36){
			alert('Script stopped');
			localStorage.removeItem(window.location.href);
			location.reload();
		}
	})
	
	var delay = localStorage.getItem(DELAY_KEY);
	if (delay == null){
		delay = 10000;
	} else {
	  delay = parseInt(delay);
	}
	
	var delayRandom = localStorage.getItem(DELAY_RANDOM_KEY);
	if (delayRandom == null){
		delayRandom = 1000;
	} else {
	  delayRandom = parseInt(delayRandom);
	}
	
	var pause = pauseEnabled();
	if (pause == null){
		pause = true;
	}
	
	var signalPrice = localStorage.getItem(window.location.href);
	
	$(generateAlertHtml(signalPrice != null)).insertAfter( "h2.text-warning" );
	$("#delay").val(delay);
	$("#delayRandom").val(delayRandom);
	$("#pauseFlag").prop("checked", pause);
	$( "#applySignalButton" ).click(function() {
		if ($("#signalPrice").val()){
			localStorage.setItem(window.location.href, $("#signalPrice").val());
		}
		localStorage.setItem(DELAY_KEY, $("#delay").val());
		localStorage.setItem(DELAY_RANDOM_KEY, $("#delayRandom").val());
		localStorage.setItem(PAUSE_KEY, $("#pauseFlag").prop("checked"));
		location.reload();
	});
	$( "#clearStorage" ).click(function() {
		localStorage.clear();
		location.reload();
	});
	
	if (signalPrice != null){
		$("#signalPrice").val(signalPrice);
		var found = false;
		$('.gold-amount').each(function( index, value ) {
			var price = parseInt($(value).contents().eq(2).text().split(',').join(''));
			var number = parseInt($(value).contents().eq(6).text().split(',').join(''));
			var total = parseInt($(value).contents().eq(10).text().split(',').join(''));
			var name = $(value).parent().find('td').first().contents().eq(3).text();
			if (price < signalPrice){
				$(value).parent().css('background-color', '#b94a48');
				var linkk = $(value).parent().attr("data-on-click-link");
				if (!localStorage.getItem(linkk)){
					speak(name);
					localStorage.setItem(linkk, "found");
				}
				var found = true;
				$("#badgeFound").removeClass("hidden");
				$("#badgeActive").addClass("hidden");
				$("#badgeConfig").addClass("hidden");
			}
		});
		if (!found || !pause){
			setTimeout(function func() {
				location.reload();
			}, delay + Math.floor(Math.random() * delayRandom));
		}
	}
});
function generateAlertHtml(active) {
	return `
	<div id="help-collect-data-alert" class="alert alert-warning alert-dismissable" role="alert">
		<form class="row col-md-12 form-horizontal">
			<div class="col-md-12">
				<div class="row form-group">
					<h3 id="badgeConfig" class=" ${active ? 'hidden' : ''}">Script config</h3>
					<h3 id="badgeActive" class="btn-primary ${active ? '' : 'hidden'}">Script active</h3>
					<h3 id="badgeFound" class="btn-success hidden">Found !!!</h3>
				</div> 	
				<div class="row form-group">
					<div class="col-md-1"><label for="delay" class="control-label">Delay</label></div>
					<div class="col-md-3"><input type="text" id="delay" class="form-control inline-block"></div>
					<div class="col-md-3"><input type="text" id="delayRandom" class="form-control inline-block"></div>
				</div>	
				<div class="row form-group">
					<div class="col-md-1"><label for="sinalPrice" class="control-label">Price </label></div>
					<div class="col-md-3"><input type="text" id="signalPrice" class="form-control inline-block"></div>
				<div class="col-md-4">
					<div class="checkbox">
						<input type="checkbox" id="pauseFlag" class="f"> 
						<label class="" for="pauseFlag">Pause when found</label>
					</div>
				</div>	
				</div> <div class="row form-group">
					<div class="col-md-2">
						<button type="button" id="applySignalButton" class="btn btn-success form-control inline-block" data-dismiss="alert">Apply</button>
					</div>
					<div class="col-md-2"></div>
					<div class="col-md-2">
						<button type="button" id="clearStorage" class="btn btn-danger form-control inline-block" data-dismiss="alert">Clear storage</button>
					</div>
					<div class="col-md-2">
						<a href="https://translate.google.com/translate?hl=&sl=ja&tl=ru&u=${window.location.href}" class="btn btn-primary form-control inline-block" data-dismiss="alert">-> Translate</a>
					</div>
				</div>
			</div>
		</form>
	</div>`
	
}
function speak(text){
	var msg = new SpeechSynthesisUtterance(text);
	if (/[а-яА-ЯЁё]/.test(text)){
		msg.lang="ru-RU"
	}
	window.speechSynthesis.speak(msg);
}
function pauseEnabled(){
	return localStorage.getItem(PAUSE_KEY) == 'true' ? true : false;
}
