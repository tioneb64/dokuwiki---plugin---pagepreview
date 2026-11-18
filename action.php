<?php

use dokuwiki\Extension\ActionPlugin;
use dokuwiki\Extension\Event;
use dokuwiki\Extension\EventHandler;

/**
 * Pagepreview : fournit au script l'aperçu (haut de page) d'une page, via ajax.php
 */
class action_plugin_pagepreview extends ActionPlugin
{
    /** Balises sans contenu ni balise fermante */
    protected const VOID = ['br', 'img', 'hr', 'input', 'meta', 'link', 'wbr', 'col'];

    /** @inheritdoc */
    public function register(EventHandler $controller)
    {
        $controller->register_hook('AJAX_CALL_UNKNOWN', 'BEFORE', $this, 'ajax');
        $controller->register_hook('DOKUWIKI_STARTED', 'AFTER', $this, 'jsinfo');
    }

    /** Réglages transmis au script */
    public function jsinfo(Event $event)
    {
        global $JSINFO;
        $JSINFO['pagepreview'] = ['delay' => max(0, (int)$this->getConf('delay'))];
    }

    /** ?call=plugin_pagepreview&id=ns:page */
    public function ajax(Event $event)
    {
        if ($event->data !== 'plugin_pagepreview') return;
        $event->preventDefault();
        $event->stopPropagation();

        global $INPUT;
        header('Content-Type: application/json; charset=utf-8');

        $id = cleanID($INPUT->str('id'));
        if ($id === '' || !page_exists($id) || auth_quickaclcheck($id) < AUTH_READ) {
            http_status(404);
            echo json_encode(['error' => 'notfound']);
            return;
        }

        $title = p_get_first_heading($id, METADATA_DONT_RENDER) ?: noNS($id);
        echo json_encode([
            'id' => $id,
            'title' => $title,
            'url' => wl($id, '', false, '&'),
            'html' => $this->preview($id),
        ], JSON_UNESCAPED_UNICODE);
    }

    /** Haut de la page rendue, sans boutons d'édition ni identifiants en double */
    protected function preview(string $id): string
    {
        $html = (string)p_wiki_xhtml($id);
        $html = preg_replace('#<form class="button btn_secedit".*?</form>#s', '', $html);
        // la fiche d'en-tête (plugin fmeta) est réduite à son statut et ses tags : le détail des
        // champs et les alertes prendraient toute la place de l'aperçu
        $html = preg_replace('#<dl class="fm-fields">.*?</dl>#s', '', $html);
        $html = preg_replace('#<div class="fm-alert[^"]*">.*?</div>#s', '', $html);
        $html = preg_replace('#\sid="[^"]*"#', '', $html);
        return $this->truncate($html, max(200, (int)$this->getConf('chars')));
    }

    /**
     * Coupe le HTML après environ $limit caractères de texte, en refermant les balises ouvertes
     *
     * Sans le module DOM de PHP : on parcourt les balises et le texte.
     */
    protected function truncate(string $html, int $limit): string
    {
        $parts = preg_split('/(<[^>]*>)/', $html, -1, PREG_SPLIT_DELIM_CAPTURE | PREG_SPLIT_NO_EMPTY);
        $out = '';
        $stack = [];
        $count = 0;

        foreach ($parts as $part) {
            if ($part[0] !== '<') {
                $out .= $part;
                $count += mb_strlen(trim(html_entity_decode($part)));
                if ($count >= $limit) break;
                continue;
            }
            if (!preg_match('#^<(/?)([a-zA-Z0-9]+)#', $part, $m)) {
                $out .= $part;                              // commentaire, doctype
                continue;
            }
            $name = strtolower($m[2]);
            if ($m[1] === '/') {
                // ferme la balise correspondante (et celles restées ouvertes au-dessus)
                $pos = array_search($name, array_reverse($stack, true), true);
                if ($pos !== false) $stack = array_slice($stack, 0, $pos);
                $out .= $part;
            } elseif (in_array($name, self::VOID, true) || substr($part, -2) === '/>') {
                $out .= $part;
            } else {
                $stack[] = $name;
                $out .= $part;
            }
        }
        foreach (array_reverse($stack) as $name) $out .= '</' . $name . '>';
        return $out;
    }
}
