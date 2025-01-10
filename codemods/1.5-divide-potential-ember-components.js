/*

1. Set threshold for how much lines of code is worth extracting
2. Find bits of a component that reach that threshold of migrateable code
3. Create a child component of that component. 
4. Add those lines into that component.

It could be easy to start with markdown only so it's 1:1 and no

<div>
	<p>SOmething</p>
	<p>SOmething</p>
	<p>SOmething</p>
	<p>SOmething</p>
	<p>SOmething</p>
	<p>SOmething</p>
</div>
<BsButton />
<SomethingReallyComplexInEmber />

-> 

<SillySomethingChildComponent />
<BsButton />
<SomethingReallyComplexInEmber />
*/