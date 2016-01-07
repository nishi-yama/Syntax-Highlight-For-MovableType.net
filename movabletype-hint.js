(function(mod) {
  if (typeof exports == "object" && typeof module == "object") // CommonJS
    mod(require("lib/codemirror"));
  else if (typeof define == "function" && define.amd) // AMD
    define(["lib/codemirror"], mod);
  else // Plain browser env
    mod(CodeMirror);
})(function(CodeMirror) {
  "use strict";

  if ($('#template-form').length === 0) {
    return;
  }

  var editor, tags, tagsWithLowercase, tagMap, candidatesForTag, candidatesForTagModifire;

  function buildCache() {
    tags = CodeMirrorCompleteTags["functions"]
      .concat(CodeMirrorCompleteTags["blocks"]);
    tags.sort();
    tagsWithLowercase = $.map(tags, function(t) {
      return [[t.toLowerCase(), t]];
    });
    tagMap = {};
    tags.forEach(function(t) {
      tagMap[t.toLowerCase()] = 1;
    });

    candidatesForTag = {};
    candidatesForTagModifire = {};
  }

  function select(list, part) {
    if (part == '' || part == undefined) {
      return list;
    }

    return $.grep(list, function(t) {
      return t.indexOf(part) == 0;
    });
  }

  function selectByHead(list, part) {
    if (part == '' || part == undefined) {
      return $.map(list, function(t) {
        return t[1];
      });
    }

    return $.map($.grep(list, function(t) {
      return t[0].indexOf(part) == 0;
    }), function(t) {
      return t[1];
    });
  }

  function completeTag(part) {
    if (! part) {
      return tags;
    }

    return selectByHead(tagsWithLowercase, part.toLowerCase());
  }

  function completeName(part) {
    var value = editor.getValue();
    var ms = value.match(/<\s*mt:?[^>]*(name|setvar)=("|')(.*?)\2/g) || [];
    var defaultNames = [
      '__key__', '__value__',
      '__first__', '__last__',
      '__odd__', '__even__', '__counter__',
      '__cond_value__', '__cond_name__'
    ];
    var namesFromSource = $.map(ms, function(m) {
      var n = m.match(/.*(name|setvar)=("|')(.*?)\2/)[3];
      if ($.inArray(n, defaultNames) == -1) {
        return n;
      }
      else {
        return [];
      }
    });
    namesFromSource.sort();
    namesFromSource = $.unique(namesFromSource);

    return select(namesFromSource.concat(defaultNames), part.toLowerCase());
  }

  function completeModifier(tag, part) {
    tag = tag.toLowerCase();

    if (! candidatesForTag[tag]) {
      var candidates = [];
      $.each(['', tag], function() {
        var modifiers = CodeMirrorCompleteModifiers[this + ''];
        if (! modifiers) {
          return;
        }
        $.each(modifiers, function(k, v) {
          candidates.push(k);
        });
      });
      candidates.sort();
      candidates = $.unique(candidates);

      candidatesForTag[tag] = candidates;
    }
    return select(candidatesForTag[tag], part.toLowerCase());
  }

  function completeModifierValue(tag, modifire, part) {
    tag = tag.toLowerCase();
    modifire = modifire.toLowerCase();

    if (
      ! candidatesForTagModifire[tag] ||
      ! candidatesForTagModifire[tag][modifire]
    ) {
      if (! candidatesForTagModifire[tag]) {
        candidatesForTagModifire[tag] = {};
      }
      candidatesForTagModifire[tag][modifire] = [];

      var values = [];
      $.each(['', tag], function() {
        var modifiers = CodeMirrorCompleteModifiers[this + ''];
        if (! modifiers) {
          return;
        }
        values = values.concat(modifiers[modifire] || []);
      });
      values.sort();
      values = $.unique(values);

      candidatesForTagModifire[tag][modifire] = values;
    }

    var alreadies = part.match(/(.*,)/);
    var alreadiesMap = {};
    if (alreadies) {
      alreadies[1].split(',').forEach(function(a) {
        alreadiesMap[a] = 1;
      });
    }
    var candidates = $.grep(candidatesForTagModifire[tag][modifire], function(c) {
      return !alreadiesMap[c];
    });

    var list = select(candidates, part.replace(/.*,/, "").toLowerCase());
    if (! list) {
      return list;
    }
    if (alreadies) {
      list.offset = alreadies[1].length;
    }

    return list;
  }

  CodeMirror.registerGlobalHelper("hint", "movabletype", function() { return true; }, function(_editor) {
    editor = _editor;

    var cur = editor.getCursor();

    function tryToComplete(func, part) {
      if (part == undefined) {
        part = '';
      }

      var list = func(part);
      if (! list || ! list.length) {
        return null;
      }

      return {
        from: { line: cur.line, ch: cur.ch - part.length + (list.offset || 0) },
        to: { line: cur.line, ch: cur.ch },
        list: list
      };
    }


    var str = editor.getRange(
      { line: cur.line, ch: 0 },
      { line: cur.line, ch: cur.ch }
    );

    var fetchedLine = cur.line;
    var m;
    for (var i = 1; i <= 10; i++) {
      m = str.match(/<\s*(\/?)\$?(mt:?([\w:]*))(\s*[^>]*)$/i);
      if (m || fetchedLine == 0) {
        break;
      }
      str = editor.getLine(--fetchedLine) + '\n' + str;
    }

    if (! m) {
      return null;
    }

    if (! m[4]) {
      if (m[1]) {
        function completeCloseTag(part) {
          if (part == undefined) {
            part = '';
          }

          while (true) {
            var ms = str.match(/<\s*(\/?)mt:?([\w:]*)\s*[^>]*>/gi);
            var notClosedTag = null;
            var stack = [];
            if (ms) {
              $.each(ms.reverse(), function() {
                var tag = this + '';

                if (tag.match(/\/\s*>$/)) {
                  return;
                }

                var m = tag.match(/<\s*(\/?)(mt:?([\w:]*))/i);
                if (m[1]) {
                  stack.unshift(m[3].toLowerCase());
                }
                else if (m[3] && tagMap[m[3].toLowerCase()]) {
                  if (stack[0] == m[3].toLowerCase()) {
                    stack.shift();
                  }
                  else {
                    notClosedTag = m[2];
                    return false;
                  }
                }
              });
            }

            if (notClosedTag) {
              return [notClosedTag + '>'];
            }

            if (fetchedLine == 0) {
              break;
            }
            str = editor.getLine(--fetchedLine) + '\n' + str;
          }

          return null;
        }
        return tryToComplete(completeCloseTag, m[2]);
      }
      else {
        return tryToComplete(completeTag, m[3]);
      }
    }

    var tag = m[3];
    m = m[4].match(/^(\s*\w+=("|').*?\2\s*)*\s*(\w+)?(=("|')(.*))?$/);

    if (! m || ! m[3] || ! m[4]) {
      return tryToComplete(function(part) {
        return completeModifier(tag, part);
      }, m ? m[3] : '');
    }
    else if (
      m[3] == 'name' ||
      m[3] == 'setvar' ||
      (m[6] && m[6].substring(0, 1) == '$')
    ) {
      return tryToComplete(
        completeName,
        (m[3] == 'name' || m[3] == 'setvar') ? m[6] : m[6].substring(1)
      );
    }
    else if (m[3] == 'tag') {
      return tryToComplete(completeTag, m[6]);
    }
    else {
      return tryToComplete(function(part) {
        return completeModifierValue(tag, m[3], part);
      }, m[6]);
    }

    return null;
  });


  buildCache();


  var blogID = (function() {
    var m = document.location.toString().match(/\/blogs\/(\d+)/);
    return m[1];
  })();
  if (! blogID) {
    return;
  }

  var cacheKey = 'SHMTCodeMirrorComplete_' + blogID;

  CodeMirrorCompleteModifiers['customfieldvalue'] = CodeMirrorCompleteModifiers['customfieldvalue'] || {};
  function loadContext() {

    function loadCustomFieldIdentifiers(cache, baseURL, offset) {
      var $dfd = new $.Deferred;

      var query = offset ? ('?offset=' + offset) : '';
      $.ajax({
        url: baseURL + '/fields.js' + query,
        dataType: 'json',
      }).done(function(data) {
        $.each(data.objects, function() {
          cache['custom_field_identifiers'].push(this[2][0]['label']);
        });

        if (data.hasNext && offset < 5) {
          loadCustomFieldIdentifiers(cache, baseURL, (offset || 0) + 1).done(function() {
            $dfd.resolve();
          });
        }
        else {
          $dfd.resolve();
        }
      }).fail(function() {
        $dfd.resolve();
      });

      return $dfd.promise();
    }

    function loadBlogIdentifiers(cache, baseURL) {
      var $dfd = new $.Deferred;

      $.ajax({
        url: baseURL,
      }).done(function(data) {
        var urls = [baseURL];
        $(data).find(".panel-blog-list .col-blog-name a").each(function() {
          urls.push($(this).prop("href"));
        });

        var $blogConfigDFD = new $.Deferred;
        $blogConfigDFD.resolve();

        $.each(urls, function() {
          var url = this;
          $blogConfigDFD = $blogConfigDFD.then(function() {
            var $dfd = new $.Deferred;

            $.ajax({
              url: url + "/settings",
            }).done(function(data) {
              var id = $($(data).find("#identifier")).val();
              if (id) {
                cache['blog_identifiers'].push(id);
              }
            })
            .complete(function() {
              $dfd.resolve();
            });

            return $dfd.promise();
          }).fail(function() {
            $dfd.resolve();
          });
        });

        $blogConfigDFD.always(function() {
          $dfd.resolve();
        });
      }).fail(function() {
        $dfd.resolve();
      });

      return $dfd.promise();
    }

    function loadTemplateNames(cache, baseURL) {
      var $dfd = new $.Deferred;

      $.ajax({
        url: baseURL + '/templates',
      }).done(function(data) {
        $(data).find('#template-modules-form tbody tr').each(function() {
          var name = $.trim($(this).text());
          cache['include_module_names'].push(name);
        });
        $dfd.resolve();
      }).fail(function() {
        $dfd.resolve();
      });

      return $dfd.promise();
    }

    function done(cache) {
      CodeMirrorCompleteModifiers['customfieldvalue']['identifier'] =
        cache['custom_field_identifiers'];
      CodeMirrorCompleteModifiers['include']['module'] =
        CodeMirrorCompleteModifiers['includeblock']['module'] =
          cache['include_module_names'];
      CodeMirrorCompleteModifiers['']['blog_id'] =
        CodeMirrorCompleteModifiers['']['blog_ids'] =
          cache['blog_identifiers'];
      buildCache();
    }

    if (sessionStorage[cacheKey]) {
      return done(JSON.parse(sessionStorage[cacheKey]));
    }

    var data = {
      blog_identifiers: [],
      custom_field_identifiers: [],
      include_module_names: [],
    };

    var blogURL   = $('#current-blog a').prop('href') || $('#current-site a').prop('href');
    var parentURL = $('#current-blog').length === 0 ? null : $('#current-site a').prop('href');

    var $dfd = loadCustomFieldIdentifiers(data, blogURL);
    if (parentURL) {
      $dfd = $dfd.then(function() {
        return loadCustomFieldIdentifiers(data, parentURL);
      });
    }

    $dfd = $dfd.then(function() {
      return loadTemplateNames(data, blogURL);
    });
    if (parentURL) {
      $dfd = $dfd.then(function() {
        return loadTemplateNames(data, parentURL);
      });
    }

    $dfd = $dfd.then(function() {
      return loadBlogIdentifiers(data, $('#current-site a').prop('href'));
    });

    $dfd.done(function() {
      sessionStorage[cacheKey] = JSON.stringify(data);
      done(data);
    });
  }

  loadContext();

  var $reloadContext = $('<a href="#"><span class="fa fa-refresh"></span> ' + chrome.i18n.getMessage('reload_autocomplete_context') + '</a>').on('click', function() {
    sessionStorage.removeItem(cacheKey);
    loadContext();
    return false;
  });

  $('#text').parents('.form-group').append($('<div class="text-right"></div>').append($reloadContext));

});
