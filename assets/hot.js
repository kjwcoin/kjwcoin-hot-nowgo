(function () {
  var SPOTS = [
    { name: "[가매장] 매콤 철판 닭갈비", price: "14,000원", lat: 37.5645, lng: 126.9215 },
    { name: "[가매장] 얼큰 장칼국수", price: "9,500원", lat: 37.5606, lng: 126.9203 },
    { name: "[가매장] 달콤매콤 떡볶이", price: "6,500원", lat: 37.5601, lng: 126.9223 },
  ];

  function init() {
    var container = document.getElementById("hot-map");
    if (!container || typeof kakao === "undefined") return;

    var map = new kakao.maps.Map(container, {
      center: new kakao.maps.LatLng(37.5619, 126.9218),
      level: 4,
    });
    map.setZoomable(true);

    SPOTS.forEach(function (spot) {
      var position = new kakao.maps.LatLng(spot.lat, spot.lng);
      var el = document.createElement("div");
      el.className = "hot-pin";
      el.innerHTML =
        '<span class="hot-pin__name">' + spot.name + "</span>" +
        '<span class="hot-pin__dot"> · </span>' +
        '<span class="hot-pin__price">' + spot.price + "</span>";

      var overlay = new kakao.maps.CustomOverlay({
        position: position,
        content: el,
        yAnchor: 1.35,
      });
      overlay.setMap(map);
    });
  }

  if (typeof kakao !== "undefined" && kakao.maps && kakao.maps.load) {
    kakao.maps.load(init);
  }
})();
