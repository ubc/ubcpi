'use strict';

describe( 'UBCPI XBlock', function() {

    var mockRuntime = {};
    var element;
    var fixture;

    jasmine.getFixtures().fixturesPath = 'base/fixtures';

    beforeEach( function() {

    } );

    // Testing fixtures
    it( 'Outputs the question title', function() {

        fixture = loadFixtures( 'question-form.html' );
        var question_heading = $( '.question-text' ).text();

        expect( question_heading ).toEqual( 'Question:' );

    } );

    // Test the unique XBlock ID
    it( 'Ensures XBlock IDs are unique', function() {

        var idOne = generatePIXBlockID();
        var idTwo = generatePIXBlockID();

        expect( idOne ).not.toEqual( idTwo );

    } );

    // it( 'has no idea what it is doing', function() {
    //
    //     fixture = loadFixtures( 'question-form.html' );
    //
    //     mockRuntime = jasmine.createSpyObj( 'runtime', ['handlerUrl'] );
    //     mockRuntime.handlerUrl.and.callFake( function() {
    //         return 'test url';
    //     } );
    //
    //     // Intercept POST requests through JQuery
    //     spyOn( $, 'ajax' ).and.callFake( function( params ) {
    //         // Call through to the success handler
    //         params.success( {up:'test up', down:'test down'} );
    //     });
    //
    //     element = $( 'fieldset' ).get();
    //
    //     var pixb = PeerInstructionXBlock( mockRuntime, element );
    //
    // } );

} );
