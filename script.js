if ($('#template-form').length === 0) {
  return;
}

if($('#outfile').get(0)){
    var str = $('#outfile').val();
    var str = str.split('.');
    if (str[str.length - 1].toLowerCase() == 'css'){
        var lang = "lang:css";
    } else if(str[str.length -1].toLowerCase() == 'js') {
        var lang = "lang:javascript";
    } else if(str[str.length -1].toLowerCase() == 'xml') {
        var lang = "lang:html";
    } else if(str[str.length -1].toLowerCase() == 'html') {
        var lang = "lang:html";
    } else {
        var lang = "lang:html";
    }
} else {
    var lang = "lang:html";
}

$("textarea").attr({
    "mt:editor": "codemirror",
    "mt:editor-options": lang
});

var options = $('#text').attr('mt:editor-options');
var editor_params = {
    lineNumbers: true,
    lineWrapping: false,
    indentUnit: 0
};

if (options.match('lang:css')) {
    editor_params['mode'] = "text/css";
} else if (options.match('lang:javascript')) {
    editor_params['mode'] = "text/javascript";
} else if (options.match('lang:html')) {
    editor_params['mode'] = "text/html";
}

var editor = CodeMirror.fromTextArea(jQuery('#text').get(0), editor_params);

function syncEditor() {
    var wrapper = editor.getWrapperElement();
    if ( $(wrapper).css('display') == 'none') {
        editor.setValue($('#text').val());
    } else {
        $('#text').val(editor.getValue());
    }
}

$(function() {
    $('input#submit').click(function() {
        syncEditor();
        $('form#template-form').val('save');
    });
});
