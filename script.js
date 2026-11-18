/**
 * Pagepreview : au survol d'un lien interne, affiche le haut de la page visée dans une carte
 * flottante. L'icône à double flèche, en haut à droite de la carte, ouvre la page.
 *
 * Les aperçus sont imbriqués comme dans Obsidian : un lien d'une carte ouvre une nouvelle carte
 * par-dessus. Une carte reste ouverte tant que la souris est sur elle, sur le lien qui l'a
 * ouverte, ou sur une carte plus profonde ; les autres se ferment après un court délai.
 */
jQuery(function () {
    'use strict';

    // pas de survol sur un écran tactile
    if (window.matchMedia && !window.matchMedia('(hover: hover)').matches) return;

    var conf = (window.JSINFO && JSINFO.pagepreview) || {};
    var delay = typeof conf.delay === 'number' ? conf.delay : 400;
    var hideDelay = 250;
    var maxDepth = 5;
    var lang = (window.LANG && LANG.plugins && LANG.plugins.pagepreview) || {};

    var cache = {};          // id -> {title, url, html}
    var stack = [];          // cartes ouvertes : {$pop, $link}, l'indice est le niveau
    var keep = -1;           // plus profond niveau à conserver ; -1 = tout fermer
    var showTimer = null;
    var hideTimer = null;
    var token = 0;           // ignore les réponses d'un survol déjà abandonné

    var ICON = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" ' +
        'stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
        '<path d="M14 3h7v7M10 21H3v-7M21 3l-7.5 7.5M3 21l7.5-7.5"/></svg>';

    /** Niveau de la carte qui contient cet élément, -1 s'il est dans la page */
    function levelOf(el) {
        var $c = jQuery(el).closest('.plugin_pagepreview');
        return $c.length ? parseInt($c.attr('data-level'), 10) : -1;
    }

    function closeFrom(n) {
        while (stack.length > n) stack.pop().$pop.remove();
    }

    function closeAll() {
        clearTimeout(showTimer);
        clearTimeout(hideTimer);
        token++;
        keep = -1;
        closeFrom(0);
    }

    /** Ferme, après un court délai, les cartes plus profondes que `keep` */
    function schedule() {
        clearTimeout(hideTimer);
        hideTimer = setTimeout(function () {
            closeFrom(keep + 1);
        }, hideDelay);
    }

    function place($pop, $link) {
        var r = $link[0].getBoundingClientRect();
        var w = $pop.outerWidth();
        var h = $pop.outerHeight();
        var left = Math.max(8, Math.min(r.left, window.innerWidth - w - 8));
        var top = r.bottom + 6;
        if (top + h > window.innerHeight - 8 && r.top - h - 6 > 8) top = r.top - h - 6;
        $pop.css({left: left + 'px', top: Math.max(8, top) + 'px'});
    }

    /** Les citations « > [!info] Titre » (syntaxe Obsidian) deviennent des encadrés */
    function callouts($body) {
        $body.find('blockquote').each(function () {
            var $p = jQuery(this).find('p').first();
            var node = $p.contents().first()[0];
            if (!node || node.nodeType !== 3) return;
            var m = node.nodeValue.match(/^\s*\[!(\w+)\][+-]?[ \t]*([^\n]*)\n?/);
            if (!m) return;
            node.nodeValue = node.nodeValue.substring(m[0].length);
            $p.prepend(jQuery('<strong class="pp-callout-title"></strong>')
                .text(m[2] || m[1].charAt(0).toUpperCase() + m[1].slice(1)));
            jQuery(this).addClass('pp-callout pp-' + m[1].toLowerCase());
        });
    }

    function show($link, data, level) {
        closeFrom(level);
        var $head = jQuery('<div class="pp-head"></div>')
            .append(jQuery('<span class="pp-title"></span>').text(data.title))
            .append(jQuery('<a class="pp-open"></a>')
                .attr({href: data.url, title: lang.open || 'Ouvrir la page'})
                .html(ICON));
        var $pop = jQuery('<div class="plugin_pagepreview" role="tooltip"></div>')
            .attr('data-level', level)
            .css('z-index', 2000 + level)
            .append($head)
            .append(jQuery('<div class="pp-body"></div>').html(data.html))
            .appendTo(document.body);

        $pop.on('mouseenter', function () {
            keep = level;
            schedule();
        }).on('mouseleave', function (e) {
            keep = levelOf(e.relatedTarget);
            schedule();
        });

        callouts($pop.find('.pp-body'));
        stack[level] = {$pop: $pop, $link: $link};
        keep = level;
        place($pop, $link);
    }

    function load(id, done) {
        if (cache[id]) return done(cache[id]);
        jQuery.getJSON(DOKU_BASE + 'lib/exe/ajax.php', {call: 'plugin_pagepreview', id: id})
            .done(function (data) {
                if (data && data.html !== undefined) {
                    cache[id] = data;
                    done(data);
                }
            });
    }

    jQuery(document).on('mouseenter', 'a[data-wiki-id]', function () {
        var $link = jQuery(this);
        var parent = levelOf(this);             // niveau de la carte qui contient le lien
        var id = $link.attr('data-wiki-id');
        if (!id || id === (window.JSINFO && JSINFO.id)) return;     // pas vers la page courante
        if ($link.hasClass('wikilink2')) return;                    // page inexistante

        clearTimeout(hideTimer);
        clearTimeout(showTimer);
        var child = stack[parent + 1];
        if (child && child.$link[0] === this) {                     // sa carte est déjà ouverte
            keep = parent + 1;
            return;
        }
        keep = parent;
        schedule();                                                 // ferme les cartes devenues inutiles
        if (parent + 1 >= maxDepth) return;

        var mine = ++token;
        showTimer = setTimeout(function () {
            load(id, function (data) {
                if (mine === token) show($link, data, parent + 1);
            });
        }, delay);
    }).on('mouseleave', 'a[data-wiki-id]', function (e) {
        clearTimeout(showTimer);
        token++;
        keep = levelOf(e.relatedTarget);        // où va la souris : page, cette carte, une autre carte
        schedule();
    });

    jQuery(document).on('keydown', function (e) {
        if (e.key === 'Escape') closeAll();
    });
    jQuery(window).on('scroll', function () {
        if (stack.length) closeAll();
    });
});
