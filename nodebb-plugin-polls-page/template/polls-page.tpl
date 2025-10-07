<h1>{title}</h1>
<p>{message}</p>

<ul>
  {{each topics as topic}}
    <li>
      <a href="/topic/{{topic.tid}}">{{topic.title}}</a>
      <span> — {{topic.replies}} replies</span>
    </li>
  {{/each}}
</ul>

<div style="width:100%;height:50px;background:lightgray;margin-top:20px;">
  <!-- This gray box proves the template is rendering -->
  Template is rendering ✅
</div>