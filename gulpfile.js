/*global require, console */

var gulp = require('gulp');
var replace = require('gulp-replace-task');
var rename = require('gulp-rename');
var concat = require('gulp-concat');
var uglify = require('gulp-uglify');
var minifyCss = require('gulp-minify-css');
var connect = require('gulp-connect');
//var browserSync = require('browser-sync').create();
var gutil = require('gulp-util');


/* Use a dependency chain to build in the correct order - starting with the final task.
    Each task has the dependcy of the previous task listed
*/
gulp.task('default', ['serve'], function () {
    //gulp.watch('src/*.*', ['copytodist', 'serve']);
});


/* Build the appcache file. Updates the timestamp comment with the current date/time.  This is required to force a re-load of
    the cached files.
*/
gulp.task('appcachetimestamp', function () {
    gulp.src('src/weeklystats.appcache')
        .pipe(replace({
            patterns: [
                {
                    match: 'timestamp',
                    replacement: new Date().getTime()
        }
      ]
        }))
        .pipe(gulp.dest('build/'));
});

/* Build the javascript - concatenates and minifies the files required to run.
 */
gulp.task('buildjs', ['appcachetimestamp'], function () {
    gulp.src(['src/simple-assert.js', 'src/rate-limit-promises.js', 'src/ga.js', 'src/c3-chart-generator.js', 'src/chart-data-retrieval.js', 'src/build-data-charts.js'])
        .pipe(concat('weekly-stats-c3.js'))
        .pipe(gulp.dest('build/'))
        .pipe(rename('weekly-stats-c3.min.js'))
        .pipe(uglify()).on('error', gutil.log)
        .pipe(gulp.dest('build/'));
});

/* Minify the CSS used for Open Sesame (same is used for stand alone and chrome extension).
 */
gulp.task('minifycss', ['buildjs'], function () {
    gulp.src(['src/*.css'])
        .pipe(concat('weekly-stats-c3.css'))
        .pipe(gulp.dest('build/'))
        .pipe(rename('weekly-stats-c3.min.css'))
        .pipe(minifyCss()).on('error', gutil.log)
        .pipe(gulp.dest('build/'));
});

/* Copy all the required files for stand alone operation to the build directory.
 */
gulp.task('copytobuild', ['minifycss'], function () {
    gulp.src(['src/*.html', 'lib/masonry.pkgd.min.js', 'lib/c3.min.js', 'lib/d3.v3.min.js'])
        .pipe(gulp.dest('build/'));
});

/* Watch for changes to html and then reload when updated
 */
gulp.task('html', ['copytobuild'], function () {
    gulp.src('./build/*.html')
        .pipe(connect.reload());
});

/* Standard server task */
gulp.task('serve', ['copytobuild'], function () {
    connect.server({
        root: 'build',
        livereload: true
    });

    /*browserSync.init({
        server: "./dist",
        options: {
            proxy: "localhost:8080"
        }
    });*/

    //Execute the html task anytime the source files change
    gulp.watch('src/*.*', ['html']);
    //gulp.watch("dist/*.*").on('change', browserSync.reload);
});
