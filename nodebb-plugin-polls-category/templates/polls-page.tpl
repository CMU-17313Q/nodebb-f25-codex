<h1>{title}</h1>

<ul>
  <!--% for (var i = 0; i < topics.length; i++) { %-->
    <li>
      <a href="/topic/<!--%:= topics[i].tid %-->"><!--%:= topics[i].title %--></a>
      <span>— <!--%:= topics[i].replies %--> replies</span>
    </li>
  <!--% } %-->
</ul>