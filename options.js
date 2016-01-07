$(function(){
    $(":submit").click(function () {
        $(":input[name]").each(function() {
            localStorage[this.name] = this.value;
        });
        window.close();
    });

    $(":input[name]").each(function() {
        this.value = localStorage[this.name] || this.dataset.defaultValue || "";
    });

    $("[data-message]").each(function() {
        var $this = $(this);
        $this.html(chrome.i18n.getMessage($this.data("message")));
    });
});
