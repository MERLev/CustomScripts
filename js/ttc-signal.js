// ==UserScript==
// @name         ttc-signal
// @updateUrl    https://raw.githubusercontent.com/MERLev/CustomScripts/master/js/ttc-signal.js
// @downloadUrl  https://raw.githubusercontent.com/MERLev/CustomScripts/master/js/ttc-signal.js
// @version      0.4.12
// @description  Notifications for ttc
// @author       Mer1e
// @include      https://*eu.tamrieltradecentre.com/*
// @require      http://code.jquery.com/jquery-3.4.1.min.js
// @grant        GM_addStyle
// @grant        GM_listValues
// @grant        GM_deleteValue
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_log
// ==/UserScript==

(function() {
    'use strict';

	//-- DEBUG
    GM_addStyle("");
    GM_listValues();
    GM_setValue("123", 123);
    GM_getValue("123");
    GM_deleteValue("123");
	//-- DEBUG

	GM_addStyle(`
		.signal-alert{
			position: fixed;
			top: 215px;
			right: 10px;
			width: 379px;
			opacity: 25%;
		}
		.signal-alert:hover, .signal-alert.active{
			opacity:100%
		}
		.progressbar{
			width: 0%;
			height: 51px;
			background-color: #5d4ac3;
			position: fixed;
			opacity: 40%;
			top: 0px;
			z-index: 2000;
			transition-timing-function: linear;
		}
		.badge{
			font-size: 75%;
			font-weight: 700;
			padding: .25em .4em;
			border-radius: .25rem;
			vertical-align: bottom;
		}
		.badge-success {
			color: #fff;
			background-color: #28a745;
		}
		.right {
			float:right;
		}
	`);

	const DEFAULT_SEARCH = {
		delay: 5000,
		delayRandom: 5000,
		price: 10000,
		autoPause: true,
		active: false
	}

    const StorageUtils = {
		SAVED_SEARCHES: "SAVED_SEARCHES",
		SAVED_OFFERS: "SAVED_OFFERS",
		SAVED_DEFAULTS: "SAVED_DEFAULTS",
		LAST_CLEANUP_TIME: "LAST_CLEANUP_TIME",
		SEARCH_TTL: 7 * 24 * 60 * 60 * 1000,
		OFFER_TTL: 12 * 60 * 60 * 1000,
		CLEANUP_PERIOD: 6 * 60 * 60 * 1000,

		loadDefaults: function(){
			return GM_getValue(StorageUtils.SAVED_DEFAULTS);
		},
		saveDefaults: function(defaults){
			GM_setValue(StorageUtils.SAVED_DEFAULTS, defaults);
		},
		loadCurrentSearch: function(){
			var searchesList = GM_getValue(StorageUtils.SAVED_SEARCHES);
			if (searchesList[currentPageId()]){
				return searchesList[currentPageId()];
			}
			return null;
		},
		saveSearch: function(search){
			var savedSearches = GM_getValue(StorageUtils.SAVED_SEARCHES);
			savedSearches[currentPageId()] = search;
			GM_setValue(StorageUtils.SAVED_SEARCHES, savedSearches);
		},
		isOfferFound: function(offer){
			var offersList = GM_getValue(StorageUtils.SAVED_OFFERS);
			return offersList[offer.hash];
		},
		saveFoundOffer: function(offer){
			var offersList = GM_getValue(StorageUtils.SAVED_OFFERS);
			offersList[offer.hash] = offer;
			GM_setValue(StorageUtils.SAVED_OFFERS, offersList);
		},
		resetStorage: function(){
			GM_deleteValue(StorageUtils.SAVED_SEARCHES);
			GM_deleteValue(StorageUtils.SAVED_OFFERS);
			GM_deleteValue(StorageUtils.SAVED_DEFAULTS);
		},
		initStorage: function(){
			if (!GM_getValue(StorageUtils.SAVED_SEARCHES)){
				GM_setValue(StorageUtils.SAVED_SEARCHES, {});
			}
			if (!GM_getValue(StorageUtils.SAVED_OFFERS)){
				GM_setValue(StorageUtils.SAVED_OFFERS, {});
			}
			if (!GM_getValue(StorageUtils.SAVED_DEFAULTS)){
				GM_setValue(StorageUtils.SAVED_DEFAULTS, DEFAULT_SEARCH);
			}
			if (!GM_getValue(StorageUtils.LAST_CLEANUP_TIME)){
				GM_setValue(StorageUtils.LAST_CLEANUP_TIME, new Date().getTime());
			}
		},
		cleanUp: function(){
			var lastCleanUp = GM_getValue(StorageUtils.LAST_CLEANUP_TIME);
			var time = new Date().getTime();
			if (time - lastCleanUp > StorageUtils.CLEANUP_PERIOD){
				var searchesList = GM_getValue(StorageUtils.SAVED_SEARCHES);
				for (var pageId in searchesList) {
					if (time - searchesList[pageId].time > StorageUtils.SEARCH_TTL){
						delete searchesList[pageId];
					}
				}
				GM_setValue(StorageUtils.SAVED_SEARCHES, searchesList);

				var offersList = GM_getValue(StorageUtils.SAVED_OFFERS);
				for (var offerId in offersList) {
					if (time - offersList[offerId].time > StorageUtils.OFFER_TTL){
						delete offersList[offerId];
					}
				}
				GM_setValue(StorageUtils.SAVED_OFFERS, offersList);
				GM_setValue(StorageUtils.LAST_CLEANUP_TIME, time);
			}
		}
    }
	const AudioUtils = {
		speak: function(text){
			if (window.speechSynthesis == undefined){
				AudioUtils.beep(1000, 2);
				return;
			}
			var msg = new SpeechSynthesisUtterance(text);
			if (/[а-яА-ЯЁё]/.test(text)){
				msg.lang="ru-RU"
			}
			window.speechSynthesis.speak(msg);
		},
		beep: (function () {
			var ctxClass = window.audioContext ||window.AudioContext || window.AudioContext || window.webkitAudioContext
			var ctx = new ctxClass();
			return function (duration, type, finishedCallback) {

				duration = +duration;

				// Only 0-4 are valid types.
				type = (type % 5) || 0;

				if (typeof finishedCallback != "function") {
					finishedCallback = function () {};
				}

				var osc = ctx.createOscillator();

				osc.type = type;
				//osc.type = "sine";

				osc.connect(ctx.destination);
				if (osc.noteOn) osc.noteOn(0); // old browsers
				if (osc.start) osc.start(); // new browsers

				setTimeout(function () {
					if (osc.noteOff) osc.noteOff(0); // old browsers
					if (osc.stop) osc.stop(); // new browsers
					finishedCallback();
				}, duration);

			};
		})()
	}
	$( document ).ready(function() {
		if (!window.location.href.includes("SearchResult")){
			return
		}
		if ($("#g-recaptcha-response")[0]){
			AudioUtils.speak('Капча, капча');
            if (window.top != window.self) {
                setTimeout(function(){
                    location.reload();
                }, 2000);
                return;
            }
			//return
		}
		if ($("#body section > div > h1").text() == "Error"){
			window.history.back();
		}

        if (window.top === window.self) {
			if (window.location.href.includes("translate.google")){
				//$("#wtgbr").hide();
				//$("#gt-c").hide();
				//$("#contentframe").css("top", "0px");
				return;
			}
			$("#topNavBar > ul.nav.navbar-nav.navbar-right")
                .prepend(`<li><a href="${getTranslaterUrl()}" class="">Go down the rabbit hole</a></li>`)
            //return
        }
		$("body").css("background", "black");

		StorageUtils.initStorage();
		StorageUtils.cleanUp();
		var currSearch = StorageUtils.loadCurrentSearch();
		var defaults = StorageUtils.loadDefaults();
		$(document).keyup(function (e){
			if(e.keyCode == 36){
				if (currSearch){
					currSearch.active = false;
					StorageUtils.saveCurrentSearch(search);
				}
				alert('Script stopped');
				location.reload();
			}
		});

		var found = false;
		if (currSearch != null && currSearch.active){
			$('.gold-amount').each(function( index, value ) {
				var offer = parseOffer(value);
				if (offer.price < currSearch.price){
					$(value).parent().css('background-color', '#b94a48');
					if (!StorageUtils.isOfferFound(offer)){
						AudioUtils.speak(offer.name);
						StorageUtils.saveFoundOffer(offer);
						found = true;
					}
				}
			});
		}
		if (found && currSearch.autoPause){
			currSearch.active = false;
			StorageUtils.saveSearch(currSearch);
		}
		drawAlert(currSearch, defaults, found);
		if (currSearch != null && currSearch.active){
			var calculatedDelay = currSearch.delay + Math.floor(Math.random() * currSearch.delayRandom);
			$(".progressbar").css("transition",  "width " + calculatedDelay + "ms linear");
			$(".progressbar").css("width",  "100%");
			setTimeout(function func() {
				location.reload();
			}, calculatedDelay);
		}
	});
	function drawAlert(currSearch, defaults){
		$("#help-collect-data-alert").remove();
		$('<div class="progressbar"></div>').insertAfter(".navbar");
		$(generateAlertHtml(currSearch != null ? currSearch : defaults)).insertBefore("h2.text-warning");
		$("#startBtn").click(function() {
			var search = parseSearch();
			search.active = true;
			search.time = new Date().getTime();
			StorageUtils.saveSearch(search);
			location.reload();
		});
		$("#stopBtn").click(function() {
			var search = parseSearch();
			search.active = false;
			search.time = new Date().getTime();
			StorageUtils.saveSearch(search);
			location.reload();
		});
		$( "#resetBtn" ).click(function() {
			StorageUtils.resetStorage();
			location.reload();
		});
		$( "#saveAsDefaultsBtn" ).click(function() {
			var search = parseSearch();
			search.active = false;
			StorageUtils.saveDefaults(search);
			//location.reload();
		});
	}
	function generateAlertHtml(search) {
		return `
		<div class="alert alert-warning signal-alert ${search.active ? 'active' : ''}">
			<form class="form-horizontal">
				<div class="">
					<div class="row form-group">
						<div class="col-md-8"><h3 id="badgeConfig" class="">Script config</h3></div>
						<div class="col-md-4"><h3 id="badgeConfig" class="right ${!search.active ? 'hidden' : ''}"><span class="badge badge-success">ACTIVE</span></h3></div>
					</div>
					<div class="row form-group">
						<div class="col-md-6"><label for="delayInp" class="control-label">Delay</label></div>
						<div class="col-md-6"><input type="text" id="delayInp" class="form-control inline-block" value="${search.delay}"></div>
					</div>
					<div class="row form-group">
						<div class="col-md-6"><label for="delayInp" class="control-label">Delay Random</label></div>
						<div class="col-md-6"><input type="text" id="delayRandomInp" class="form-control inline-block" value="${search.delayRandom}"></div>
					</div>
					<div class="row form-group">
						<div class="col-md-6"><label for="priceInp" class="control-label">Price </label></div>
						<div class="col-md-6"><input type="text" id="priceInp" class="form-control inline-block" value="${search.price}"></div>
					</div>
					<div class="row form-group">
						<div class="col-md-12">
							<div class="checkbox">
								<input type="checkbox" id="autoPauseInp" class="f" ${search.autoPause ? 'checked' : ''}>
								<label class="" for="autoPauseInp">Pause when found</label>
							</div>
						</div>
					</div>
					<div class="row form-group">
						<div class="col-md-6">
							<button type="button" id="startBtn" class="btn btn-success form-control inline-block ${search.active ? 'hidden' : ''}">Start</button>
							<button type="button" id="stopBtn" class="btn btn-danger form-control inline-block ${search.active ? '' : 'hidden'}">Stop</button>
						</div>
						<div class="col-md-6">
							<button type="button" id="resetBtn" class="btn btn-danger form-control inline-block hidden">Reset script</button>
							<button type="button" id="saveAsDefaultsBtn" class="btn btn-info form-control inline-block ${search.active ? 'hidden' : ''}">Save as Default</button>
						</div>
					</div>
				</div>
			</form>
		</div>`
	}
	function hashCode(s){
		return s.split("").reduce(function(a,b){a=((a<<5)-a)+b.charCodeAt(0);return a&a},0);
	}
	function parseOffer(el){
		var url = $(el).parent().attr("data-on-click-link");
		return {
			price: parseInt($(el).contents().eq(2).text().split(',').join('')),
			number: parseInt($(el).contents().eq(6).text().split(',').join('')),
			total: parseInt($(el).contents().eq(10).text().split(',').join('')),
			name: $(el).parent().find('td').first().contents().eq(3).text(),
			url: url,
			hash: hashCode(url),
			time: new Date().getTime()
		}
	}
	function parseSearch(){
		return {
			delay: parseInt($("#delayInp").val()),
			delayRandom: parseInt($("#delayRandomInp").val()),
			price: parseInt($("#priceInp").val()),
			autoPause: $("#autoPauseInp").is(":checked"),
			active: false
		}
	}
	function currentPageId(){
		var cleanUrl = /SearchResult?(.*)/.exec(window.location.href)[0].split("&anno")[0];
		return hashCode(cleanUrl);
	}
	function getTranslaterUrl(){
		var url = window.location.href;
		if (!location.href.includes("ru-RU")){
			url += "&lang=ru-RU";
		}
		return `https://translate.google.com/translate?hl=&sl=ja&tl=ru&u=${encodeURIComponent(url)}&anno=2`;
	}
})();