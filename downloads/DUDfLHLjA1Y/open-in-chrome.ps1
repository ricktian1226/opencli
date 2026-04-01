$chrome = 'C:\Program Files\Google\Chrome\Application\chrome.exe'
if (-not (Test-Path $chrome)) {
  throw 'Chrome not found at default path.'
}
$urls = @(
  'https://scontent-nrt6-1.cdninstagram.com/v/t51.82787-15/624152177_18624000544019133_9038291962942176007_n.jpg?stp=dst-jpg_e35_tt6&_nc_cat=105&ig_cache_key=MzgyMDAzNDAxMjAwNjMyMTQ5Ng%3D%3D.3-ccb7-5&ccb=7-5&_nc_sid=58cdad&efg=eyJ2ZW5jb2RlX3RhZyI6InhwaWRzLjEwODB4MTM1MC5zZHIuQzMifQ%3D%3D&_nc_ohc=5-zmnQ80h2QQ7kNvwGDwyMv&_nc_oc=AdrS1KtNy3UNcRSJzcdmkdbefLsBipyk8fZc9H7GUIu12lJbZcqKWVOaQAU6sMe9khs&_nc_ad=z-m&_nc_cid=0&_nc_zt=23&_nc_ht=scontent-nrt6-1.cdninstagram.com&_nc_gid=WcAsf5YhjyAjvdWYQB3mXg&_nc_ss=7a32e&oh=00_AfyZ_Ahy_J5Jn3lVkOibqyZrJS8LFW4ivoxKwkXs9eyTcw&oe=69D1A773'
)
foreach ($url in $urls) {
  Start-Process -FilePath $chrome -ArgumentList $url
  Start-Sleep -Milliseconds 500
}
