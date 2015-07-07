'use strict';

// describe('JavaScript addition operator', function () {
//
//     it('adds two numbers together', function () {
//         expect(1 + 2).toEqual(3);
//     });
// });

describe( 'UBCPI XBlock', function() {

    var mockRuntime;
    var element;
    var fixture;

    jasmine.getFixtures().fixturesPath = 'base/fixtures';

    beforeEach( function() {

    } );

    it( 'Outputs the question title', function() {

        fixture = loadFixtures( 'question-form.html' );
        var question_heading = $( '.question-text' ).text();
        expect( question_heading ).toEqual( 'Question:' );

    } );

} );

// // 'use strict';
// //
// // describe( 'UBCPI XBlock', function() {
// //
// //     var mockRuntime;
// //     var element;
// //     var fixture;
// //
// //     beforeEach( function(){
// //
// //         console.log( 'test' ) ;
// //         // fixture = loadFixtures( 'question-form.html' );
// //         //
// //         // var post = fixture.find('form');
// //         // console.log( post );
// //     } );
// //
// // } );
//
// describe("Thumbs XBlock", function() {
//
//     var thumbs;
//     var mockRuntime;
//     var element;
//
//     beforeEach( function() {
//
//         // Install the HTML fixture for this test
//
//         setFixtures('<div class="ubcpi_block">\n' +
//             '<p>Question: What is the answer to Life, the Universe, and Everything?</p>\n' +
//             '<form>\n' +
//                 '<ul>\n' +
//                     '<li><input name="q" type="radio" value="A"/>22</li>\n' +
//                     '<li><input name="q" type="radio" value="B"/>42</li>\n' +
//                     '<li><input name="q" type="radio" value="C"/>945</li>\n' +
//                 '</ul>\n' +
//             '</form>\n' +
//         '</p>\n' +
//         '</div>\n') ;
//
//         // Create a mock for the runtime
//         mockRuntime = jasmine.createSpyObj('runtime', ['handlerUrl']);
//         mockRuntime.handlerUrl.andCallFake(function() {
//             return 'test url';
//         });
//
//         // Intercept POST requests through JQuery
//         spyOn($, 'ajax').andCallFake(function(params) {
//             // Call through to the success handler
//             params.success({up:'test up', down:'test down'});
//         });
//
//         // Load the HTML fixture defined in the test runner
//         element = $('.ubcpi_block').get();
//
//         // Run the ThumbsBlock script
//         PeerInstructionXBlock(mockRuntime, element);
//     });
//
//     it("radio button on click", function() {
//         // Click the upvote <span>
//         $('input[type="radio"]').eq(0).click();
//
//         // Expect that the XBlock is updated via HTTP POST request
//         expect($.ajax).toHaveBeenCalled();
//
//         // Expect that the HTML gets updated
//         // actual = $('#fixture .upvote .count').text();
//         expect(  $('input[type="radio"]:checked').val() ).toEqual('A');
//     });
//
//     // it("downvotes on click", function() {
//     //     // Click the downvote <span>
//     //     $('#fixture .downvote').click();
//
//     //     // Expect that the XBlock is updated via HTTP POST request
//     //     expect($.ajax).toHaveBeenCalled();
//
//     //     // Expect that the HTML gets updated
//     //     actual = $('#fixture .downvote .count').text();
//     //     expect(actual).toEqual('test down');
//     // });
// });
