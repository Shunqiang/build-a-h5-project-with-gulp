var gulp = require('gulp'),
    $ = require('gulp-load-plugins')(),
    browserSync = require('browser-sync'),
    del = require('del'),
    runSequence = require('run-sequence'),
    stripDebug = require('gulp-strip-debug'),
    spritesmith = require('gulp.spritesmith'),
    rev = require('gulp-rev'),
    revFormat = require('gulp-rev-format'),
    _replace = require('gulp-replace'),
    revReplace = require('gulp-rev-replace');

/**
 * @param dev 开发环境目录
 * @param build 生产环境目录
*/
var path = {
    dev: './src/', 
    build: './dist/'
}

//jshint 代码检测
gulp.task('jsh', function() {
    return gulp.src([path.dev + 'js/**/*.js','!'+path.dev+'js/plugins/**/*.js'])
    .pipe($.jshint())
    .pipe($.jshint.reporter('default'));
});

//压缩js
gulp.task('minjs', function() {
    return gulp.src([path.dev + 'js/**/*.js'])
    .pipe($.sourcemaps.init())
    .pipe(stripDebug()) //清除console.log
    .pipe($.uglify()) // js文件 压缩
    .pipe($.sourcemaps.write('./'),{addComment: false})
    .pipe(gulp.dest(path.build + 'js'))
});


//压缩图片
gulp.task('minimage', function () {
    return gulp.src(path.dev + 'img/*.{png,jpg,gif,ico}')
        .pipe($.imagemin({
            optimizationLevel: 4, //类型：Number  默认：3  取值范围：0-7（优化等级）
            //progressive: true //类型：Boolean 默认：false 无损压缩jpg图片
        }))
        .pipe(gulp.dest(path.build + 'img'));
});


gulp.task('del', function (cb) {
    return del(["dist"], cb) // 构建前先删除dist文件里的旧版本
});

//移动font文件
gulp.task('font', function() {
    return gulp.src(path.dev + 'font/**/*')
    .pipe(gulp.dest(path.build + 'font'))
});

/**
 *  开发环境监听
 */
//sass编译
gulp.task('styles', function() {
    return gulp.src(path.dev + 'sass/style.scss')
    .pipe($.sass().on('error',$.sass.logError))
    .pipe(gulp.dest(path.dev + 'css'))
});

//css 文件压缩
gulp.task('mincss', function() {
    return gulp.src(path.dev + 'css/style.css')
    .pipe($.sourcemaps.init())
    .pipe($.cleanCss())
    .pipe($.sourcemaps.write('./',{addComment: false}))
    .pipe(gulp.dest(path.build + 'css'))
});

gulp.task('rev', function() {
    return gulp.src([path.build + '**/*.*', '!**/*.map'])
    .pipe(rev())
    .pipe(revFormat({
        prefix: '.',
        suffix: '.cache',
        lastExt: false
    }))
    .pipe(rev.manifest({merge: true}))
    .pipe(gulp.dest('rev/'));
});

//自动添加版本号和压缩html
gulp.task('revHtml', ['rev'], function () {
    var manifest = gulp.src(["./rev/rev-manifest.json"]),
        options = {
            removeComments: true,//清除HTML注释
            collapseWhitespace: true,//压缩HTML
            collapseBooleanAttributes: false,//省略布尔属性的值 <input checked="true"/> ==> <input />
            removeEmptyAttributes: false,//删除所有空格作属性值 <input id="" /> ==> <input />
            minifyJS: true,//压缩页面JS
            minifyCSS: true//压缩页面CSS
        };

    function modifyUnreved(filename) {
        return filename;
    }
    
    function modifyReved(filename) {
        // filename是：index.69cef10fff.cache.css的一个文件名
        // gulp-rev-format的作用做正则匹配，
        if (filename.indexOf('.cache') > -1) {
            // 通过正则和relace得到版本号：69cef10fff
            const _version = filename.match(/\.[\w]*\.cache/)[0].replace(/(\.|cache)*/g, "");
            // 把版本号和gulp-rev-format生成的字符去掉，剩下的就是原文件名：index.css
            const _filename = filename.replace(/\.[\w]*\.cache/, "");
            // 重新定义文件名和版本号：index.css?v=69cef10fff
            filename = _filename + "?v=" + _version;
            // 返回由gulp-rev-replace替换文件名
            return filename;
            // 可自由定制路径
        }
        return filename;
    }
    gulp.src([path.dev + '**/*.html'])
        .pipe(_replace(/(\.[a-z]+)\?(v=)?[^\'\"\&]*/g, "$1"))
        .pipe(revReplace({
            manifest: manifest,
            modifyUnreved: modifyUnreved,
            modifyReved: modifyReved
        }))
        .pipe($.htmlmin(options)) 
        .pipe(gulp.dest(path.build));
});

gulp.task('watchDEV', function() {
    browserSync.init({
        server: {baseDir: path.dev},
        index: 'index.html'
    })
    gulp.watch(path.dev + 'sass/*.scss',['styles']).on('change',browserSync.reload);
    gulp.watch(path.dev + '**/*.html').on('change',browserSync.reload);
    gulp.watch(path.dev + 'js/*.js').on('change',browserSync.reload);
});

// 删除文件
gulp.task('clean', function() {
    return del([  
        path.build + 'css/**/*.map',
        path.build + 'js/**/*.map'
      ]);
})
//正式构建
gulp.task("build", ['del'], runSequence(
    //编译、压缩文件
    ['jsh'], 
    ['minjs'],
    ['mincss'],
    ['minimage'],
    ['clean'],
    ['font'],
    //MD5版本号、版本替换
    ['revHtml'],
    ['watchDEV']
));
