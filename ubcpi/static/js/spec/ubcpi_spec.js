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

describe( 'UBCPI XBlock Statuses', function() {

    var mockSelf;

    beforeEach( function() {
        mockSelf = {};
    } );

    // Test the default statuses are as we expect
    it( 'Ensures the default statuses are as we expect', function() {

        var statuses = setDefaultStatuses( mockSelf );

        expect( mockSelf.STATUS_NEW ).toEqual( 0 );
        expect( mockSelf.STATUS_ANSWERED ).toEqual( 1 );
        expect( mockSelf.STATUS_REVISED ).toEqual( 2 );

    } );

    // Test what status is set when on the first step
    it( 'Ensures status 0 when on first step', function() {

        mockSelf = setDefaultStatuses( mockSelf );

        var answer_original = null;
        var answer_revised = null;

        var status = getStatus( answer_original, answer_revised, mockSelf );

        expect( status ).toEqual( 0 );

    } );

    // Test what status is set when on the second step
    it( 'Ensures status 1 when on second step', function() {

        mockSelf = setDefaultStatuses( mockSelf );

        var answer_original = 'Test answer';
        var answer_revised = null;

        var status = getStatus( answer_original, answer_revised, mockSelf );

        expect( status ).toEqual( 1 );

    } );

    // Test what status is set when on the third step
    it( 'Ensures status 2 when on third step', function() {

        mockSelf = setDefaultStatuses( mockSelf );

        var answer_original = 'Test answer';
        var answer_revised = 'Revised answer';

        var status = getStatus( answer_original, answer_revised, mockSelf );

        expect( status ).toEqual( 2 );

    } );

} );
